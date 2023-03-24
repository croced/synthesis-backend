import { model, Schema, Document } from 'mongoose';

export interface IUser {
//   email: string;
  username: string;
  password: string;
}

export interface UserDocument extends IUser, Document {}

const userSchema = new Schema<UserDocument>({
//   email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

export const User = model<UserDocument>('user', userSchema);