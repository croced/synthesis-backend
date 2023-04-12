import express, { Request, Response } from "express";
import * as mongoose from 'mongoose';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserDocument, User } from "./models/user";
import { log } from "./util";
import dotenv from "dotenv";
import cors from "cors";
import { Patch, PatchDocument } from "./models/patch";
import * as _ from "lodash";

dotenv.config();

const SERVER_PORT = process.env.SERVER_PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";

// Connect to MongoDB
try {
  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as mongoose.MongooseOptions);
} catch (error: any) {
  log(`Could not connect to MongoDB! Error: ${error}`);
}

const app = express();

// Express middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

/**
 * GET /login
 * Login route
 */
app.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  // Find user by username
  const user: UserDocument | null = await User.findOne({ username });

  if (!user)
    return res.status(401).json({ message: "Invalid username or password!" });

  // Check if password is correct
  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch)
    return res.status(401).json({ message: "Invalid username or password!" });

  if (!process.env.JWT_SECRET_KEY)
    return res.status(500).json({ message: "JWT_SECRET_KEY not set in this environment!" });

  // Generate JWT token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "2h" });
  res.status(201).json({ token });
});

/**
 * POST /register
 * Register a new user
 */
app.post("/register", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    // Check if username is already registered
    const existingUser: UserDocument | null = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ message: "Username already registered!" });

    if (!username || username.length < 8 || username.length > 32)
      return res.status(400).json({ message: "Invalid username. Username must be between 8 and 32 characters long!" });

    if (!password || password.length < 8 || password.length > 32)
      return res.status(400).json({ message: "Invalid password. Password must be between 8 and 32 characters long!" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({ username, password: hashedPassword });

    try {
      await user.save();

      // Log the user in now!
      if (!process.env.JWT_SECRET_KEY)
        return res.status(500).json({ message: "JWT_SECRET_KEY not set in this environment!" });
  
      // Generate JWT token
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "2h" });
      res.status(201).json({ token });

    } catch (error) {
      res.status(500).json({ message: `Internal server error: ${error}` });
    }
  });

/**
 * GET /user/:id
 * Get user by id
 */
app.get("/user/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  // Find user by id
  const user: UserDocument | null = await User.findOne({"_id": new mongoose.Types.ObjectId(id)});
  if (!user)
    return res.status(404).json({ message: "User not found!" });

  res.status(200).json({ user });
});

/**
 * POST /publishPatch
 * Publish a patch
 */
app.post("/publishPatch", async (req: Request, res: Response) => {
    const { patch } = req.body;
  
    try {
      JSON.parse(patch);

      if (patch._id) {
        delete patch._id;
      }
    } catch (e) {
      return res.status(400).json({ message: "Invalid JSON!" });
    }

    // Create new patch
    const patchObj = new Patch((_.omit(JSON.parse(patch), "_id")));

    try {
      await patchObj.save();

      // add patch to user's list of patches
      const { meta } = patchObj;

      if (meta.author) 
      {
        const existingUser: UserDocument | null = await User.findOne({ username: meta.author });

        if (existingUser)
          await User.updateOne({ username: meta.author }, { $push: {patches: patchObj._id} });
      };

      res.status(200).json({ patch: patchObj });
    } catch (error) {
      res.status(500).json({ message: `Internal server error: ${error}` });
    }
});

/**
 * GET /getPatches/:userId
 * Get all authored patches for a user
 */
app.get('/getPatches/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;

    // Find user by id
    const user: UserDocument | null = await User.findOne({"_id": new mongoose.Types.ObjectId(userId)});
    if (!user)
      return res.status(404).json({ message: "User not found!" });

    const patches = user.patches;

    const patchObjs = await Patch.find({ _id: { $in: patches } });

    patchObjs ? res.status(200).json({ patches: patchObjs }) 
      : res.status(404).json({ message: "No patches found!" });
});

/**
 * GET /getPatchBank/:userId
 * Get a user's patch bank
 */
app.get('/patchBank/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  // Find user by id
  const user: UserDocument | null = await User.findOne({"_id": new mongoose.Types.ObjectId(userId)});
  if (!user)
    return res.status(404).json({ message: "User not found!" });

  const patches = user.patchBank;

  const patchObjs = await Patch.find({ _id: { $in: patches } });

  patchObjs ? res.status(200).json({ patchBank: patchObjs }) 
    : res.status(404).json({ message: "No patches found!" });
});

/**
 * POST /patchBank
 * Add a patch to a user's patch bank
 */
app.post(`patchBank`, async (req: Request, res: Response) => {
  const { userId, patchId } = req.body;

  // Find user by id
  const user: UserDocument | null = await User.findOne({"_id": new mongoose.Types.ObjectId(userId)});
  if (!user)
    return res.status(404).json({ message: "User not found!" });

  if (user.patchBank.includes(patchId))
    return;
  
  const updatedBank = User.updateOne({ _id: userId }, { $push: { patchBank: patchId } });

  return res.status(200).json({ patchBank: updatedBank });
});

/**
 * DELETE /patchBank
 * Remove a patch from a user's patch bank
 */
app.delete(`patchBank`, async (req: Request, res: Response) => {
  const { userId, patchId } = req.body;

  // Find user by id
  const user: UserDocument | null = await User.findOne({"_id": new mongoose.Types.ObjectId(userId)});
  if (!user)
    return res.status(404).json({ message: "User not found!" });

  if (user.patchBank.includes(patchId))
  {
    const updatedBank = User.updateOne({ _id: userId }, { $push: { patchBank: patchId } });
    return res.status(200).json({ patchBank: updatedBank });
  }

  return res.status(200).json({ patchBank: user.patchBank });
});

/**
 * GET /getPatches
 * Get all patches
 */
app.get('/getPatches', async (_req: Request, res: Response) => {
  const patchObjs = await Patch.find({});

  patchObjs ? res.status(200).json({ patches: patchObjs }) 
    : res.status(404).json({ message: "No patches found!" });
});

app.post("/patches", async (req: Request, res: Response) => {
  const { patchName } = req.body;

  const patchObjs = await Patch.find({ "meta.name": { "$regex": patchName, "$options": "i" } },);
  res.status(200).json({ patches: patchObjs });
});

// Start server
app.listen(SERVER_PORT, () => {
  log(`Server started on port ${SERVER_PORT}`);
});