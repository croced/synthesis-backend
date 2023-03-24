import { model, Schema, Document } from 'mongoose';

export interface IUser {
  username: string;
  password: string;
}

export interface UserDocument extends IUser, Document {}

const userSchema = new Schema<UserDocument>({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

export const User = model<UserDocument>('user', userSchema);