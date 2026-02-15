import mongoose, { Schema } from "mongoose";

type UserPasskey = {
  credentialID: string;
  publicKey: string;
  counter: number;
  transports: ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[];
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
};

type NotificationPreferences = {
  inAppDueSoon: boolean;
  emailDueSoon: boolean;
  unsubscribedAll: boolean;
};

export type UserDocument = {
  name: string;
  email: string;
  passwordHash: string | null;
  googleId?: string;
  currentChallenge?: string | null;
  passkeys: UserPasskey[];
  notificationPreferences: NotificationPreferences;
  createdAt: Date;
};

const passkeySchema = new Schema<UserPasskey>(
  {
    credentialID: { type: String, required: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, required: true, default: 0 },
    transports: { type: [String], default: [] },
    deviceType: { type: String, enum: ["singleDevice", "multiDevice"], default: "singleDevice" },
    backedUp: { type: Boolean, default: false },
    createdAt: { type: Date, default: () => new Date() },
    lastUsedAt: { type: Date, default: undefined }
  },
  { _id: false }
);

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    googleId: { type: String, unique: true, sparse: true, default: undefined },
    currentChallenge: { type: String, default: null },
    passkeys: { type: [passkeySchema], default: [] },
    notificationPreferences: {
      inAppDueSoon: { type: Boolean, default: true },
      emailDueSoon: { type: Boolean, default: true },
      unsubscribedAll: { type: Boolean, default: false }
    }
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

userSchema.index({ "passkeys.credentialID": 1 }, { sparse: true });

const User = mongoose.model<UserDocument>("User", userSchema);

export default User;
