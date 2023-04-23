import { model, Schema, Document } from 'mongoose';

interface IMetaData {
    version: number;
    author: string;
    name: string;
}

interface IOscillator {
    waveType: "sine" | "square" | "sawtooth" | "triangle";
    detune?: number;
    octave?: number;
}

interface IMixer {
    type: "volume" | "additive" | "am" | "fm";
    mix: number;
    carrierOsc?: 0 | 1;     // only used for AM & FM, 0 = osc1, 1 = osc2
    fmModIndex?: number;    // only used for FM
}

interface IFilter {
    type: "lowpass" | "highpass" | "bandpass" | "lowshelf" | "highshelf" | "notch";
    signal: "1" | "2" | "combined";
    frequency: number;
    emphasis: number;
    gain: number;
}

// todo: implement mixer!
export interface IPatch {
    meta: IMetaData;
    oscillators: IOscillator[];
    mixer: IMixer;
    filters: IFilter[] | null;
}

export interface PatchDocument extends IPatch, Document {}

const patchSchema = new Schema<PatchDocument>({
    meta: { type: Object, required: true },
    oscillators: { type: [Object], required: true },
    mixer: { type: Object, required: true },
    filters: { type: [Object], required: false },
});

export const Patch = model<PatchDocument>('patch', patchSchema);