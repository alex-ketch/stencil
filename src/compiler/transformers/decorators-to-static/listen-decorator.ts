import * as d from '@declarations';
import { convertValueToLiteral, createStaticGetter, getDeclarationParameters, isDecoratorNamed, removeDecorator } from '../transform-utils';
import ts from 'typescript';
import { buildError, buildWarn } from '@utils';


export function listenDecoratorsToStatic(diagnostics: d.Diagnostic[], _sourceFile: ts.SourceFile, decoratedProps: ts.ClassElement[], typeChecker: ts.TypeChecker, newMembers: ts.ClassElement[]) {
  const listeners: ts.ArrayLiteralExpression[] = [];

  decoratedProps.forEach((prop: ts.PropertyDeclaration) => {
    listenDecoratorToStatic(diagnostics, typeChecker, listeners, prop);
  });

  if (listeners.length > 0) {
    newMembers.push(createStaticGetter('listeners', ts.createArrayLiteral(listeners, true)));
  }
}


function listenDecoratorToStatic(diagnostics: d.Diagnostic[], _typeChecker: ts.TypeChecker, listeners: any[], prop: ts.PropertyDeclaration) {
  const listenDecorator = prop.decorators && prop.decorators.find(isDecoratorNamed('Listen'));

  if (listenDecorator == null) {
    return;
  }

  removeDecorator(prop, 'Listen');

  const [ listenText, listenOptions ] = getDeclarationParameters<string, d.ListenOptions>(listenDecorator);

  const eventNames = listenText.split(',');
  if (eventNames.length > 1) {
    const warn = buildWarn(diagnostics);
    warn.messageText = 'Deprecated @Listen() feature. Use multiple @Listen() decorators instead of comma-separated names.';
  }

  eventNames.forEach(eventName => {
    listeners.push(
      validateListener(diagnostics, eventName.trim(), listenOptions, prop.name.getText())
    );
  });
}


export function validateListener(diagnostics: d.Diagnostic[], eventName: string, opts: d.ListenOptions = {}, methodName: string) {
  let rawEventName = eventName;
  let target = opts.target;

  // DEPRECATED: handle old syntax (`TARGET:event`)
  if (!target) {
    const splt = eventName.split(':');
    const prefix = splt[0].toLowerCase().trim();
    if (splt.length > 1 && isValidTargetValue(prefix)) {
      rawEventName = splt[1].trim();
      target = prefix;
      const warn = buildWarn(diagnostics);
      warn.messageText = `Deprecated @Listen() feature. Use @Listen('${rawEventName}', { target: '${prefix}' }) instead.`;
    }
  }

  // DEPRECATED: handle keycode syntax (`event:KEY`)
  const [finalEvent, keycode, rest] = rawEventName.split('.');
  if (rest === undefined && isValidKeycodeSuffix(keycode)) {
    rawEventName = finalEvent;
    const warn = buildError(diagnostics);
    warn.messageText = `Deprecated @Listen() feature. Using key is not longer supported, use "event.key" instead.`;
  }

  const listenerMeta: d.ComponentCompilerListener = {
    name: rawEventName,
    method: methodName,
    target,
    capture: (typeof opts.capture === 'boolean') ? opts.capture : false,
    passive: (typeof opts.passive === 'boolean') ? opts.passive :
      // if the event name is kown to be a passive event then set it to true
      (PASSIVE_TRUE_DEFAULTS.indexOf(rawEventName.toLowerCase()) > -1),
    disabled: (opts.enabled === false)
  };

  return convertValueToLiteral(listenerMeta);
}

export function isValidTargetValue(prefix: string): prefix is d.ListenTargetOptions  {
  return (VALID_ELEMENT_REF_PREFIXES.indexOf(prefix) > -1);
}

export function isValidKeycodeSuffix(prefix: string) {
  return (VALID_KEYCODE_SUFFIX.indexOf(prefix) > -1);
}

const PASSIVE_TRUE_DEFAULTS = [
  'dragstart', 'drag', 'dragend', 'dragenter', 'dragover', 'dragleave', 'drop',
  'mouseenter', 'mouseover', 'mousemove', 'mousedown', 'mouseup', 'mouseleave', 'mouseout', 'mousewheel',
  'pointerover', 'pointerenter', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerout', 'pointerleave',
  'resize',
  'scroll',
  'touchstart', 'touchmove', 'touchend', 'touchenter', 'touchleave', 'touchcancel',
  'wheel',
];

const VALID_ELEMENT_REF_PREFIXES = [
  'parent', 'body', 'document', 'window'
];

const VALID_KEYCODE_SUFFIX = [
  'enter', 'escape', 'space', 'tab', 'up', 'right', 'down', 'left'
];
