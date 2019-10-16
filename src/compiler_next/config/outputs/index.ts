import * as d from '../../../declarations';
import { buildError } from '@utils';
import { VALID_TYPES_NEXT, isOutputTargetDistCollection, isOutputTargetDistCustomElement, isOutputTargetDistLazy, isOutputTargetWww } from '../../../compiler/output-targets/output-utils';
import { validateCollection } from './validate-collection';
import { validateCustomElement } from './validate-custom-element';
import { validateLazy } from './validate-lazy';
import { validateWww } from './validate-www';


export function validateOutputTargets(config: d.Config, diagnostics: d.Diagnostic[]) {
  const userOutputs = (config.outputTargets || []).slice();

  userOutputs.forEach(outputTarget => {
    if (!VALID_TYPES_NEXT.includes(outputTarget.type)) {
      const err = buildError(diagnostics);
      err.messageText = `invalid outputTarget type "${outputTarget.type}". Valid outputTarget types include: ${VALID_TYPES_NEXT.map(t => `"${t}"`).join(', ')}`;
    }
  });

  config.outputTargets = [
    ...validateCollection(config, userOutputs.filter(isOutputTargetDistCollection), diagnostics),
    ...validateCustomElement(config, userOutputs.filter(isOutputTargetDistCustomElement), diagnostics),
    ...validateLazy(config, userOutputs.filter(isOutputTargetDistLazy), diagnostics),
    ...validateWww(config, userOutputs.filter(isOutputTargetWww), diagnostics),
  ];
}