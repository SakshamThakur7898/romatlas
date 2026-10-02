import mongoose from 'mongoose';
import { connectDb } from '../config/db';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import {
  DeviceModel, DeviceRomSupportModel, RecoveryModel, RomModel, SourceModel,
} from '../models';

// Everything below is DEVELOPMENT SAMPLE data. Nothing is verified against a source.
const NOTE = 'DEV SAMPLE: placeholder record, not verified against any source.';

async function main() {
  if (env.NODE_ENV === 'production') throw new Error('Refusing to seed in production');
  await connectDb();
  await mongoose.syncIndexes();

  const force = process.argv.includes('--force');
  if ((await DeviceModel.estimatedDocumentCount()) > 0) {
    if (!force) {
      logger.warn('Content already present. Re-run with --force to replace it.');
      return;
    }
    await DeviceModel.deleteMany({});
    await RomModel.deleteMany({});
    await DeviceRomSupportModel.deleteMany({});
    await RecoveryModel.deleteMany({});
    await SourceModel.deleteMany({});
  }

  const [lineageSrc, crdroidSrc, twrpSrc] = await SourceModel.create([
    { name: 'LineageOS', url: 'https://lineageos.org', type: 'OFFICIAL_PROJECT', reliabilityType: 'FIRST_PARTY' },
    { name: 'crDroid', url: 'https://crdroid.net', type: 'OFFICIAL_PROJECT', reliabilityType: 'FIRST_PARTY' },
    { name: 'TWRP', url: 'https://twrp.me', type: 'OFFICIAL_PROJECT', reliabilityType: 'FIRST_PARTY' },
  ]);

  const [lineage, crdroid] = await RomModel.create([
    {
      name: 'LineageOS', slug: 'lineageos', description: 'Open-source Android distribution.',
      website: 'https://lineageos.org', officialStatus: 'OFFICIAL', sourceId: lineageSrc._id,
    },
    {
      name: 'crDroid', slug: 'crdroid', description: 'Android distribution focused on customization.',
      website: 'https://crdroid.net', officialStatus: 'OFFICIAL', sourceId: crdroidSrc._id,
    },
  ]);

  const [surya, instantnoodle] = await DeviceModel.create([
    {
      brand: 'Xiaomi', name: 'POCO X3 NFC', codename: 'surya', modelNumbers: ['M2007J20CG'],
      aliases: ['Poco X3'], chipset: 'Snapdragon 732G', architecture: 'arm64',
      releaseDate: new Date('2020-09-01'), description: NOTE,
    },
    {
      brand: 'OnePlus', name: 'OnePlus 8', codename: 'instantnoodle', modelNumbers: ['IN2013'],
      chipset: 'Snapdragon 865', architecture: 'arm64', description: NOTE,
    },
    {
      brand: 'Samsung', name: 'Galaxy S21', codename: 'o1s', modelNumbers: ['SM-G991B'],
      architecture: 'arm64', description: NOTE,
    },
  ]);

  await DeviceRomSupportModel.create([
    {
      deviceId: surya._id, romId: lineage._id, supportType: 'UNKNOWN', androidVersion: '15',
      sourceUrl: 'https://lineageos.org', notes: NOTE,
    },
    {
      deviceId: surya._id, romId: crdroid._id, supportType: 'UNKNOWN', androidVersion: '15',
      sourceUrl: 'https://crdroid.net', notes: NOTE,
    },
    {
      deviceId: instantnoodle._id, romId: lineage._id, supportType: 'UNKNOWN', androidVersion: '15',
      sourceUrl: 'https://lineageos.org', notes: NOTE,
    },
  ]);

  await RecoveryModel.create({
    name: 'TWRP', deviceId: surya._id, supportType: 'UNKNOWN',
    sourceUrl: twrpSrc.url, notes: NOTE,
  });

  logger.info('Seeded development sample data (all UNVERIFIED)');
}

main()
  .catch((err) => {
    logger.error({ err }, 'Seed failed');
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
