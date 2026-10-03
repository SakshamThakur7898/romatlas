import { Schema, model } from 'mongoose';
import { httpUrl } from './schemaTypes';
import { slugify } from '../utils/slug';

export interface IDevice {
  brand: string;
  brandSlug: string;
  name: string;
  slug: string;
  codename: string;
  modelNumbers: string[];
  aliases: string[];
  image?: string;
  releaseDate?: Date;
  chipset?: string;
  architecture?: string;
  bootloaderInformation?: string;
  currentAndroidVersion?: string;
  supported: boolean;
  description?: string;
  officialSource?: string;
}

const deviceSchema = new Schema<IDevice>(
  {
    brand: { type: String, required: true, trim: true },
    brandSlug: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    codename: { type: String, required: true, trim: true, lowercase: true },
    modelNumbers: { type: [{ type: String, trim: true, uppercase: true }], default: [] },
    aliases: { type: [{ type: String, trim: true }], default: [] },
    image: { ...httpUrl },
    releaseDate: Date,
    chipset: { type: String, trim: true },
    architecture: { type: String, enum: ['arm64', 'arm', 'x86_64', 'x86'] },
    bootloaderInformation: { type: String, trim: true },
    currentAndroidVersion: { type: String, trim: true },
    supported: { type: Boolean, default: true },
    description: { type: String, trim: true, maxlength: 2000 },
    officialSource: { ...httpUrl },
  },
  { timestamps: true },
);

deviceSchema.pre('validate', function () {
  if (this.brand && !this.brandSlug) this.brandSlug = slugify(this.brand);
  if (this.name && !this.slug) this.slug = slugify(this.name);
});

deviceSchema.index({ brandSlug: 1, slug: 1 }, { unique: true });
deviceSchema.index({ brandSlug: 1, codename: 1 }, { unique: true });
deviceSchema.index({ codename: 1 });
deviceSchema.index({ modelNumbers: 1 });
deviceSchema.index({ aliases: 1 });
deviceSchema.index(
  { name: 'text', brand: 'text', codename: 'text', modelNumbers: 'text', aliases: 'text' },
  { name: 'device_text', weights: { codename: 10, name: 8, modelNumbers: 6, aliases: 4, brand: 2 } },
);

export const DeviceModel = model<IDevice>('Device', deviceSchema);
