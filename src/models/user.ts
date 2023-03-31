import { model, Schema, Document } from 'mongoose';

export interface IUser {
  username: string;
  password: string;
  patches: string[];
}

export interface UserDocument extends IUser, Document {}

const userSchema = new Schema<UserDocument>({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  patches: [{ type: Schema.Types.ObjectId, ref: 'patch' }]
});

export const User = model<UserDocument>('user', userSchema);