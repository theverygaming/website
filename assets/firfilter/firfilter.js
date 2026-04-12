"use strict";
import Chart from "https://esm.sh/chart.js@4.5.1/auto";
import { fft, idft, util as fftUtil } from "https://esm.sh/fft-js@0.0.12";

// meh, probably a better solution out there but who cares tehee
const _existing_chart_map = {};

function linechart(canvas, name, dataArr, labels = null) {
    if (!labels) {
        labels = Array.from(dataArr.keys());
    }
    const data = {
        labels: labels,
        datasets: [{
            label: name,
            data: dataArr,
            fill: false,
            borderColor: "purple",
            tension: 0.1
        }]
    };

    if (name in _existing_chart_map) {
        _existing_chart_map[name].data = data;
        _existing_chart_map[name].update();
    } else {
        _existing_chart_map[name] = new Chart(
            canvas,
            {
                type: "line",
                data: data,
            },
        );
    }
}

function zeroPadArrTo(arr, len) {
    // already there?
    if (arr.length >= len) {
        return arr;
    }

    const zeros = new Array(len - arr.length).fill(0);
    return [...arr, ...zeros];
}

function isPowerOfTwo(x) {
    return (x & (x - 1)) == 0
}

function roundUpClosestPowerOfTwo(x) {
    if (isPowerOfTwo(x)) {
        return x;
    }
    // https://stackoverflow.com/a/466256
    return Math.pow(2, Math.ceil(Math.log(x) / Math.log(2)));
}

function zeroPadArrToPowerOfTwo(arr, len_min = 0) {
    const len_add = arr.length < len_min ? len_min - arr.length : 0;
    // already there?
    if (isPowerOfTwo(arr.length) && len_add == 0) {
        return arr;
    }

    return zeroPadArrTo(arr, roundUpClosestPowerOfTwo(arr.length + len_add));
}

function fftMag2dB(fft_mag, ) {
    return fft_mag.map(x => {
        return 20 * Math.log10(x + 1e-20)
    });
}

function getWindow(name, length) {
    switch (name) {
        case "rectangular":
            return new Array(length).fill(1);
        case "blackman":
            const alpha = 0.16;
            const a0 = (1.0 - alpha) / 2.0;
            const a2 = alpha / 2.0;
            return Array.from({ length }, (_, i) => {
                return a0 - (0.5 * Math.cos(2.0 * Math.PI * (i / length))) + (a2 * Math.cos(4.0 * Math.PI * (i / length)));
            });
        // FIXME: implement more windows
        default:
            throw new Error(`unknown window '${name}'`);
    }
}

function applyWindow(name, data) {
    const w = getWindow(name, data.length);
    return data.map((x, i) => x * w[i]);
}

class DSPFilterCalc {
    constructor() {
        this.samplerate = 0;

        this.chart_frequency_response_desired = new Chart(
            document.getElementById("frequency_response_desired"),
            {
                type: "line",
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: "frequency response (desired)",
                            data: [],
                            fill: false,
                            borderColor: "purple",
                            tension: 0.1
                        },
                    ],
                },
            },
        );

        this.chart_impulse_response = new Chart(
            document.getElementById("impulse_response"),
            {
                type: "line",
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: "impulse response",
                            data: [],
                            fill: false,
                            borderColor: "purple",
                            tension: 0.1
                        },
                    ],
                },
            },
        );
        this.chart_frequency_response = new Chart(
            document.getElementById("frequency_response"),
            {
                type: "line",
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: "frequency response (dB)",
                            data: [],
                            fill: false,
                            borderColor: "purple",
                            tension: 0.1
                        },
                    ],
                },
            },
        );

        this.onchange_system_parameters();
    }

    onchange_system_parameters() {
        this.samplerate = parseFloat(document.getElementById("samplerate").value);
        this.onchange_fircalc();
    }

    onchange_fircalc() {
        this.fir_window = document.getElementById("fir_window").value;
        this.fir_n_taps = parseInt(document.getElementById("fir_n_taps").value);

        // FIXME: omg just use the sinc function. Also I think for the sinc the number of taps must be even

        const n_taps_even = Math.floor(this.fir_n_taps / 2) * 2;
        const frequency_response_desired = Array.from({ length: n_taps_even }, (_, i) => {
            if (i >= n_taps_even / 2) {
                return 0;
            }
            return 1;
        });

        this.chart_frequency_response_desired.data.labels = Array.from({ length: n_taps_even }, (_, i) => {
            return (this.samplerate / 2) * (i / n_taps_even);
        });
        this.chart_frequency_response_desired.data.datasets[0].data = frequency_response_desired;
        this.chart_frequency_response_desired.update();

        const impulse_response_half = fftUtil.fftMag(idft(frequency_response_desired.map(x => [x, 0])));
        const impulse_response = applyWindow(this.fir_window, [
            ...[...impulse_response_half].reverse(),
            ...impulse_response_half.slice(1),
        ]).map(x => Math.min(Math.max(x, 0), 1));

        document.getElementById("fir_taps").value = JSON.stringify(impulse_response);
        this.onchange_fir();
    }

    onchange_fir() {
        const taps = JSON.parse(document.getElementById("fir_taps").value);

        this.chart_impulse_response.data.labels = Array.from(taps.keys());
        this.chart_impulse_response.data.datasets[0].data = taps;
        this.chart_impulse_response.update();

        const resp_phasors = fft(zeroPadArrToPowerOfTwo(taps, 200));
        this.chart_frequency_response.data.labels = fftUtil.fftFreq(resp_phasors, this.samplerate);
        this.chart_frequency_response.data.datasets[0].data = fftMag2dB(fftUtil.fftMag(resp_phasors));
        this.chart_frequency_response.update();
    }
};

window.onload = function () {
    window.filtercalc = new DSPFilterCalc();
}
