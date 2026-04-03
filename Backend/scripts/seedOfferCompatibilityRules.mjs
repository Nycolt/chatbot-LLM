import { Op } from 'sequelize';
import { sequelize } from '../src/config/database.js';
import SolutionOffer from '../src/models/SolutionOffer.model.js';
import OfferCompatibilityRule from '../src/models/OfferCompatibilityRule.model.js';

function normalizeSku(sku) {
  return String(sku || '').trim().toUpperCase();
}

function isBundleSku(sku) {
  const normalized = normalizeSku(sku);
  return !!normalized && normalized.includes('BDL') && !normalized.startsWith('FC-');
}

function classifyBundleType(sku) {
  const normalized = normalizeSku(sku);
  if (normalized.includes('BDL-809')) return 'enterprise';
  if (normalized.includes('BDL-950')) return 'utp';
  return 'basic';
}

function buildRulePayload(sku) {
  const bundleType = classifyBundleType(sku);

  if (bundleType === 'enterprise') {
    return {
      sku,
      bundle_type: 'enterprise',
      requires_ssl_inspection: true,
      requires_ips: true,
      requires_advanced_threat: true,
      requires_vpn: false,
      recommended_for: 'Auto-classified from solution_offers (enterprise bundle)',
    };
  }

  if (bundleType === 'utp') {
    return {
      sku,
      bundle_type: 'utp',
      requires_ssl_inspection: false,
      requires_ips: true,
      requires_advanced_threat: false,
      requires_vpn: false,
      recommended_for: 'Auto-classified from solution_offers (UTP bundle)',
    };
  }

  return {
    sku,
    bundle_type: 'basic',
    requires_ssl_inspection: false,
    requires_ips: false,
    requires_advanced_threat: false,
    requires_vpn: false,
    recommended_for: 'Auto-classified from solution_offers (basic bundle)',
  };
}

async function main() {
  await sequelize.authenticate();

  const offers = await SolutionOffer.findAll({
    attributes: ['sku'],
    where: {
      sku: { [Op.like]: '%BDL%' },
    },
    raw: true,
  });

  const uniqueSkus = [...new Set((offers || []).map((row) => normalizeSku(row.sku)).filter(isBundleSku))];

  let insertedOrUpdated = 0;
  for (const sku of uniqueSkus) {
    const payload = buildRulePayload(sku);
    await OfferCompatibilityRule.upsert(payload);
    insertedOrUpdated += 1;
  }

  console.log('offer_compatibility_rules seed complete:', {
    scannedOffers: offers.length,
    uniqueBundleSkus: uniqueSkus.length,
    insertedOrUpdated,
  });
}

try {
  await main();
} catch (error) {
  console.error('offer_compatibility_rules seed failed:', error);
  process.exitCode = 1;
} finally {
  await sequelize.close().catch(() => {});
}
