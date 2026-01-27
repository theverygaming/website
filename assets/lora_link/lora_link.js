"use strict";

// source for a bunch of stuff: https://blog.semtech.com/long-range-with-lora

// source: "Predicting LoRaWAN Capacity" - https://www.semtech.com/uploads/technology/LoRa/predicting-lorawan-capacity.pdf - Table 1. Data Rates and Required Signal-to-Noise Ratios
function lora_sf_snr(sf) {
    return (sf - 4) * -2.5;
}

function thermal_noise(bw) {
    const boltzmann = -174; // 50 Ohm Boltzmann thermal noise constant in dBm @ 300K
    return boltzmann + (10 * Math.log10(bw));
}

function rx_noise_floor(bw, nf) {
    return thermal_noise(bw)+nf;
}

function rx_sensitivity(bw, nf, sf) {
    return rx_noise_floor(bw, nf)-(-lora_sf_snr(sf));
}
