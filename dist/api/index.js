"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose = __importStar(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = require("../models/user");
const util_1 = require("../util");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const patch_1 = require("../models/patch");
const _ = __importStar(require("lodash"));
dotenv_1.default.config();
const SERVER_PORT = process.env.SERVER_PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
// Connect to MongoDB
try {
    mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
}
catch (error) {
    (0, util_1.log)(`Could not connect to MongoDB! Error: ${error}`);
}
const app = (0, express_1.default)();
// Express middleware
app.use(express_1.default.urlencoded({ extended: false }));
app.use(express_1.default.json());
app.use((0, cors_1.default)());
/**
 * GET /login
 * Login route
 */
app.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    // Find user by username
    const user = yield user_1.User.findOne({ username });
    if (!user)
        return res.status(401).json({ message: "Invalid username or password!" });
    // Check if password is correct
    const passwordMatch = yield bcrypt_1.default.compare(password, user.password);
    if (!passwordMatch)
        return res.status(401).json({ message: "Invalid username or password!" });
    if (!process.env.JWT_SECRET_KEY)
        return res.status(500).json({ message: "JWT_SECRET_KEY not set in this environment!" });
    // Generate JWT token
    const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "2h" });
    res.status(201).json({ token });
}));
/**
 * POST /register
 * Register a new user
 */
app.post("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    // Check if username is already registered
    const existingUser = yield user_1.User.findOne({ username });
    if (existingUser)
        return res.status(400).json({ message: "Username already registered!" });
    if (!username || username.length < 8 || username.length > 32)
        return res.status(400).json({ message: "Invalid username. Username must be between 8 and 32 characters long!" });
    if (!password || password.length < 8 || password.length > 32)
        return res.status(400).json({ message: "Invalid password. Password must be between 8 and 32 characters long!" });
    // Hash password
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    // Create new user
    const user = new user_1.User({ username, password: hashedPassword });
    try {
        yield user.save();
        // Log the user in now!
        if (!process.env.JWT_SECRET_KEY)
            return res.status(500).json({ message: "JWT_SECRET_KEY not set in this environment!" });
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "2h" });
        res.status(201).json({ token });
    }
    catch (error) {
        res.status(500).json({ message: `Internal server error: ${error}` });
    }
}));
/**
 * GET /user/:id
 * Get user by id
 */
app.get("/user/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    // Find user by id
    const user = yield user_1.User.findOne({ "_id": new mongoose.Types.ObjectId(id) });
    if (!user)
        return res.status(404).json({ message: "User not found!" });
    res.status(200).json({ user });
}));
/**
 * POST /publishPatch
 * Publish a patch
 */
app.post("/publishPatch", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { patch } = req.body;
    try {
        JSON.parse(patch);
        if (patch._id) {
            delete patch._id;
        }
    }
    catch (e) {
        return res.status(400).json({ message: "Invalid JSON!" });
    }
    // Create new patch
    const patchObj = new patch_1.Patch((_.omit(JSON.parse(patch), "_id")));
    try {
        yield patchObj.save();
        // add patch to user's list of patches
        const { meta } = patchObj;
        if (meta.author) {
            const existingUser = yield user_1.User.findOne({ username: meta.author });
            if (existingUser)
                yield user_1.User.updateOne({ username: meta.author }, { $push: { patches: patchObj._id } });
        }
        ;
        res.status(200).json({ patch: patchObj });
    }
    catch (error) {
        res.status(500).json({ message: `Internal server error: ${error}` });
    }
}));
/**
 * GET /getPatches/:userId
 * Get all authored patches for a user
 */
app.get('/getPatches/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    // Find user by id
    const user = yield user_1.User.findOne({ "_id": new mongoose.Types.ObjectId(userId) });
    if (!user)
        return res.status(404).json({ message: "User not found!" });
    const patches = user.patches;
    const patchObjs = yield patch_1.Patch.find({ _id: { $in: patches } });
    patchObjs ? res.status(200).json({ patches: patchObjs })
        : res.status(404).json({ message: "No patches found!" });
}));
/**
 * GET /getPatchBank/:userId
 * Get a user's patch bank
 */
app.get('/patchBank/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    if (!userId)
        return res.status(400).json({ message: "Invalid userId!" });
    // Find user by id
    const user = yield user_1.User.findOne({ "_id": new mongoose.Types.ObjectId(userId) });
    if (!user)
        return res.status(404).json({ message: "User not found!" });
    const patchBank = user.patchBank;
    const authoredPatches = user.patches;
    const patchObjs = yield patch_1.Patch.find({ _id: { $in: patchBank } });
    const authoredPatchObjs = yield patch_1.Patch.find({ _id: { $in: authoredPatches } });
    const allPatches = _.union(patchObjs, authoredPatchObjs);
    patchObjs ? res.status(200).json({ patchBank: allPatches })
        : res.status(404).json({ message: "No patches found!" });
}));
/**
 * POST /getPatchBank/:userId
 * Add a patch to a user's patch bank
 */
app.post('/patchBank/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { patchId } = req.body;
    if (!userId)
        return res.status(400).json({ message: "Invalid userId!" });
    if (!patchId)
        return res.status(400).json({ message: "Invalid patchId!" });
    try {
        const user = yield user_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found!" });
        }
        if (user.patchBank.includes(patchId)) {
            const patches = user.patchBank;
            const patchObjs = yield patch_1.Patch.find({ _id: { $in: patches } });
            const authoredPatches = user.patches;
            const authoredPatchObjs = yield patch_1.Patch.find({ _id: { $in: authoredPatches } });
            const allPatches = _.union(patchObjs, authoredPatchObjs);
            return res.status(200).json({ patchBank: allPatches });
        }
        user.patchBank.push(patchId);
        yield user.save();
        const updatedUser = yield user_1.User.findById(userId);
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found!" });
        }
        const patches = updatedUser.patchBank;
        const patchObjs = yield patch_1.Patch.find({ _id: { $in: patches } });
        const authoredPatches = user.patches;
        const authoredPatchObjs = yield patch_1.Patch.find({ _id: { $in: authoredPatches } });
        const allPatches = _.union(patchObjs, authoredPatchObjs);
        return res.status(200).json({ patchBank: allPatches });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}));
/**
 * DELETE /patchBank/:userId/:patchId
 * Remove a patch from the user's patch bank
 */
app.delete('/patchBank/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { patchId } = req.body;
    if (!userId)
        return res.status(400).json({ message: "Invalid userId!" });
    if (!patchId)
        return res.status(400).json({ message: "Invalid patchId!" });
    // Find user by id
    const user = yield user_1.User.findOne({ "_id": new mongoose.Types.ObjectId(userId) });
    if (!user) {
        return res.status(404).json({ message: "User not found!" });
    }
    // Check if patch exists in user's patch bank
    const patchIndex = user.patchBank.indexOf(patchId);
    if (patchIndex === -1) {
        const patches = user.patchBank;
        const patchObjs = yield patch_1.Patch.find({ _id: { $in: patches } });
        const authoredPatches = user.patches;
        const authoredPatchObjs = yield patch_1.Patch.find({ _id: { $in: authoredPatches } });
        const allPatches = _.union(patchObjs, authoredPatchObjs);
        return res.status(200).json({ patchBank: allPatches });
    }
    // Remove patch from user's patch bank
    user.patchBank.splice(patchIndex, 1);
    // Save changes to user document
    yield user.save();
    const patches = user.patchBank;
    const patchObjs = yield patch_1.Patch.find({ _id: { $in: patches } });
    const authoredPatches = user.patches;
    const authoredPatchObjs = yield patch_1.Patch.find({ _id: { $in: authoredPatches } });
    const allPatches = _.union(patchObjs, authoredPatchObjs);
    return res.status(200).json({ patchBank: allPatches });
}));
/**
 * GET /getPatches
 * Get all patches
 */
app.get('/getPatches', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const patchObjs = yield patch_1.Patch.find({});
    patchObjs ? res.status(200).json({ patches: patchObjs })
        : res.status(404).json({ message: "No patches found!" });
}));
app.post("/patches", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { patchName } = req.body;
    const patchObjs = yield patch_1.Patch.find({ "meta.name": { "$regex": patchName, "$options": "i" } });
    res.status(200).json({ patches: patchObjs });
}));
// Test web connection
app.get("/testWebConnection", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(200).json({ message: "Hello client!" });
}));
// Test DB connection - get all patches
app.get("/testDbConnection", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const patchObjs = yield patch_1.Patch.find({});
    patchObjs ? res.status(200).json({ patches: patchObjs })
        : res.status(404).json({ message: "No patches found!" });
}));
// Start server
app.listen(SERVER_PORT, () => {
    (0, util_1.log)(`Server started on port ${SERVER_PORT}`);
});
