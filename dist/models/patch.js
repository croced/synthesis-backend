"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Patch = void 0;
const mongoose_1 = require("mongoose");
const patchSchema = new mongoose_1.Schema({
    meta: { type: Object, required: true },
    oscillators: { type: [Object], required: true },
    mixer: { type: Object, required: true },
    filters: { type: [Object], required: false },
});
exports.Patch = (0, mongoose_1.model)('patch', patchSchema);
