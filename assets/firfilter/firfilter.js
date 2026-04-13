"use strict";
import Chart from "https://esm.sh/chart.js@4.5.1/auto";
import { fft, dft, util as fftUtil } from "https://esm.sh/fft-js@0.0.12";

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

function windowBlackman(length, alpha = 0.16) {
    const a0 = (1.0 - alpha) / 2.0;
    const a2 = alpha / 2.0;
    return Array.from({ length }, (_, i) => {
        return a0 - (0.5 * Math.cos(2.0 * Math.PI * (i / length))) + (a2 * Math.cos(4.0 * Math.PI * (i / length)));
    });
}

function windowHann(length, a0 = 0.5, a1 = -0.5) {
    return Array.from({ length }, (_, i) => {
        // https://www.sciencedirect.com/topics/engineering/hamming-window
        const x = i - (length / 2);
        return 0.5 + (1 - 0.5) * Math.cos(((2 * Math.PI) / length) * x);
    });
}

function windowHamming(length, a0 = 0.5, a1 = -0.5) {
    return Array.from({ length }, (_, i) => {
        // https://www.sciencedirect.com/topics/engineering/hamming-window
        const x = i - (length / 2);
        return 0.54 + 0.46 * Math.cos(((2 * Math.PI) / length) * x);
    });
}

function getWindow(name, length) {
    switch (name) {
        case "rectangular":
            return new Array(length).fill(1);
        case "blackman":
            return windowBlackman(length);
        case "hann":
            return windowHann(length);
        case "hamming":
            return windowHamming(length);
        default:
            throw new Error(`unknown window '${name}'`);
    }
}

function applyWindow(name, data) {
    const w = getWindow(name, data.length);
    return data.map((x, i) => x * w[i]);
}

function sinc(x) {
    if (x == 0) {
        return 1;
    }
    const xn = x * Math.PI;
    return Math.sin(xn) / xn;
}

function sinc_lp(t, f) {
    return 2 * f * sinc(2 * f * t);
}

function sinc_hp(t, f) {
    const transparent = t == 0 ? 1 : 0;
    return transparent - sinc_lp(t, f);
}

function sinc_bp(t, fl, fh) {
    return sinc_lp(t, fh) - sinc_lp(t, fl);
}

function sinc_bs(t, fl, fh) {
    return sinc_lp(t, fl) + sinc_hp(t, fh);
}

class DSPFilterCalc {
    constructor() {
        this.samplerate = 0;

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

        this.onchange_system_parameters();
    }

    onchange_system_parameters() {
        this.samplerate = parseFloat(document.getElementById("samplerate").value);
        this.onchange_fircalc();
    }

    onchange_fircalc() {
        this.fir_window = document.getElementById("fir_window").value;
        this.fir_n_taps = parseInt(document.getElementById("fir_n_taps").value);

        this.filter_type = document.getElementById("filter_type").value;
        this.filter_f1 = parseFloat(document.getElementById("filter_f1").value);
        this.filter_f2 = parseFloat(document.getElementById("filter_f2").value);
        this.filter_f0db = parseFloat(document.getElementById("filter_f0db").value);

        switch (this.filter_type) {
            case "lowpass":
            case "highpass":
                document.getElementById("filter_f2").style.display = "none";
                document.getElementById("lbl_filter_f2").style.display = "none";
                document.getElementById("br_filter_f2").style.display = "none";
                break;
            case "bandpass":
            case "bandstop":
                document.getElementById("filter_f2").style.display = "";
                document.getElementById("lbl_filter_f2").style.display = "";
                document.getElementById("br_filter_f2").style.display = "";
                break;
        }

        const n_taps_odd = this.fir_n_taps % 2 == 0 ? this.fir_n_taps + 1 : this.fir_n_taps;

        const impulse_response_raw = Array.from({ length: n_taps_odd }, (_, i) => {
            const t = i - Math.floor(n_taps_odd / 2);
            const f1 = this.filter_f1 / this.samplerate;
            const f2 = this.filter_f2 / this.samplerate;
            switch (this.filter_type) {
                case "lowpass":
                    return sinc_lp(t, f1);
                case "highpass":
                    return sinc_hp(t, f1);
                case "bandpass":
                    return sinc_bp(t, f1, f2);
                case "bandstop":
                    return sinc_bs(t, f1, f2);
            }
        });

        const impulse_response = applyWindow(this.fir_window, impulse_response_raw).map(x => Math.min(Math.max(x, -1), 1));

        // https://www.wavewalkerdsp.com/2022/02/23/designing-fir-filter-gain/
        // "Normalizing a filter to unit gain at some frequency is as simple as
        // dividing the filter weights by the magnitude of the discrete-time Fourier transform (DTFT)"
        const gain_div = fftUtil.fftMag(dft(impulse_response))[Math.round((impulse_response.length * this.filter_f0db) / this.samplerate)];

        const impulse_response_normalized = impulse_response.map(x => x / gain_div);

        document.getElementById("fir_taps").value = JSON.stringify(impulse_response_normalized);
        this.onchange_fir();
    }

    onchange_fir() {
        const taps = JSON.parse(document.getElementById("fir_taps").value);

        const resp_phasors = fft(zeroPadArrToPowerOfTwo(taps, 400));
        this.chart_frequency_response.data.labels = fftUtil.fftFreq(resp_phasors, this.samplerate);
        this.chart_frequency_response.data.datasets[0].data = fftMag2dB(fftUtil.fftMag(resp_phasors));
        this.chart_frequency_response.update();

        this.chart_impulse_response.data.labels = Array.from(taps.keys());
        this.chart_impulse_response.data.datasets[0].data = taps;
        this.chart_impulse_response.update();
    }
};

window.onload = function () {
    window.filtercalc = new DSPFilterCalc();
}
