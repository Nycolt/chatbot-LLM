/**
 * Asociaciones Sequelize del catálogo Fortinet (solutions, product_models, ofertas, specs, buzón).
 * Debe importarse después de registrar todos los modelos afectados.
 */

import Solution from './Solution.model.js';
import ProductModel from './ProductModel.model.js';
import DatasheetSource from './DatasheetSource.model.js';
import DatasheetModelMap from './DatasheetModelMap.model.js';
import ProductModelAttribute from './ProductModelAttribute.model.js';
import {
  FortigateVmSpec,
  FortimanagerSpec,
  FortiswitchSpec,
  FortiapSpec,
  FortimailSpec,
  FortiwebSpec,
} from './SolutionSpecs.models.js';
import ModelOfferLink from './ModelOfferLink.model.js';
import SolutionOffer from './SolutionOffer.model.js';
import NeedsInbox from './NeedsInbox.model.js';
import NeedInboxTag from './NeedInboxTag.model.js';
import IntentKeyword from './IntentKeyword.model.js';

let catalogAssociationsInitialized = false;

export function setupCatalogAssociations() {
  if (catalogAssociationsInitialized) return;
  catalogAssociationsInitialized = true;

  ProductModel.belongsTo(Solution, { foreignKey: 'solution_id', as: 'solution' });
  Solution.hasMany(ProductModel, { foreignKey: 'solution_id', as: 'product_models' });

  DatasheetSource.belongsTo(Solution, { foreignKey: 'solution_id', as: 'solution' });
  Solution.hasMany(DatasheetSource, { foreignKey: 'solution_id', as: 'datasheet_sources' });

  DatasheetModelMap.belongsTo(DatasheetSource, { foreignKey: 'datasheet_source_id', as: 'datasheet_source' });
  DatasheetSource.hasMany(DatasheetModelMap, { foreignKey: 'datasheet_source_id', as: 'datasheet_model_maps' });

  DatasheetModelMap.belongsTo(ProductModel, { foreignKey: 'product_model_id', as: 'product_model' });
  ProductModel.hasMany(DatasheetModelMap, { foreignKey: 'product_model_id', as: 'datasheet_model_maps' });

  ProductModelAttribute.belongsTo(ProductModel, { foreignKey: 'product_model_id', as: 'product_model' });
  ProductModel.hasMany(ProductModelAttribute, { foreignKey: 'product_model_id', as: 'product_model_attributes' });

  const specPairs = [
    [FortigateVmSpec, 'fortigate_vm_spec'],
    [FortimanagerSpec, 'fortimanager_spec'],
    [FortiswitchSpec, 'fortiswitch_spec'],
    [FortiapSpec, 'fortiap_spec'],
    [FortimailSpec, 'fortimail_spec'],
    [FortiwebSpec, 'fortiweb_spec'],
  ];

  for (const [SpecModel, alias] of specPairs) {
    SpecModel.belongsTo(ProductModel, { foreignKey: 'product_model_id', as: 'product_model' });
    ProductModel.hasMany(SpecModel, { foreignKey: 'product_model_id', as: alias });
  }
  /* fortiwifi_specs / fortianalyzer_specs: sin FK en la tabla; relación por UNIT = product_models.unit.
     fortiswitch_specs: clave principal lógica `unit` (FS-*); product_model_id opcional para enlace. */

  ModelOfferLink.belongsTo(ProductModel, { foreignKey: 'product_model_id', as: 'product_model' });
  ModelOfferLink.belongsTo(SolutionOffer, { foreignKey: 'solution_offer_id', as: 'solution_offer' });
  ProductModel.hasMany(ModelOfferLink, { foreignKey: 'product_model_id', as: 'model_offer_links' });
  SolutionOffer.hasMany(ModelOfferLink, { foreignKey: 'solution_offer_id', as: 'model_offer_links' });

  SolutionOffer.belongsTo(Solution, { foreignKey: 'solution_id', as: 'solution' });
  SolutionOffer.belongsTo(ProductModel, { foreignKey: 'product_model_id', as: 'product_model' });
  Solution.hasMany(SolutionOffer, { foreignKey: 'solution_id', as: 'solution_offers' });
  ProductModel.hasMany(SolutionOffer, { foreignKey: 'product_model_id', as: 'solution_offers' });

  NeedsInbox.belongsTo(Solution, { foreignKey: 'solution_id', as: 'solution' });
  Solution.hasMany(NeedsInbox, { foreignKey: 'solution_id', as: 'needs_inbox_items' });

  NeedInboxTag.belongsTo(NeedsInbox, { foreignKey: 'needs_inbox_id', as: 'needs_inbox' });
  NeedsInbox.hasMany(NeedInboxTag, { foreignKey: 'needs_inbox_id', as: 'need_inbox_tags' });

  IntentKeyword.belongsTo(Solution, { foreignKey: 'solution_id', as: 'solution' });
  Solution.hasMany(IntentKeyword, { foreignKey: 'solution_id', as: 'intent_keywords' });
}

export default setupCatalogAssociations;
