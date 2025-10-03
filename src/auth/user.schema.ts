import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ type: String, default: null })
  verificationToken: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);