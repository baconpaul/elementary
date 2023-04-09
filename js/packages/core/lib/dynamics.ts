import {
  createNode,
  isNode,
  resolve,
} from '../nodeUtils';

import type {NodeRepr_t} from '../src/Reconciler.gen';

import * as co from './core';
import * as ma from './math';
import * as si from './signals';


type OptionalKeyProps = {
  key?: string,
}

// NEED Signals library stuffs for tau2pole and db2gain yayay
const el = {
  ...co,
  ...ma,
  ...si,
};

function CompressComposite({children}) {
  const [atkMs, relMs, threshold, ratio, sidechain, xn] = children;
  const env = el.env(
    el.tau2pole(el.mul(0.001, atkMs)),
    el.tau2pole(el.mul(0.001, relMs)),
    sidechain,
  );

  const envDecibels = el.gain2db(env);

  // Strength here is on the range [0, 1] where 0 = 1:1, 1 = infinity:1.
  //
  // We therefore need to map [1, infinity] onto [0, 1] for the standard "ratio" idea,
  // which is done here. We do so by basically arbitrarily saying any ratio value 50:1 or
  // greater is considered inf:1.
  const strength = el.select(
    el.leq(ratio, 1),
    0,
    el.select(
      el.geq(ratio, 50),
      1,
      el.div(1, ratio),
    ),
  );

  const gain = el.select(
    el.ge(envDecibels, threshold),
    el.db2gain(
      el.mul(
        el.sub(threshold, envDecibels),
        strength,
      ),
    ),
    1,
  );

  return resolve(el.mul(xn, gain));
}

/* A simple hard-knee compressor with parameterized attack and release times,
 * threshold, and compression ratio.
 *
 * Users may drive the compressor with an optional sidechain signal, or send the
 * same input both as the input to be compressed and as the sidechain signal itself
 * for standard compressor behavior.
 *
 * @param {Node | number} atkMs – attack time in milliseconds
 * @param {Node | number} relMs – release time in millseconds
 * @param {Node | number} threshold – decibel value above which the comp kicks in
 * @param {Node | number} ratio – ratio by which we squash signal above the threshold
 * @param {Node} sidechain – sidechain signal to drive the compressor
 * @param {Node} xn – input signal to filter
 */
export function compress(
  attackMs: NodeRepr_t | number,
  releaseMs: NodeRepr_t | number,
  threshold: NodeRepr_t | number,
  ratio: NodeRepr_t | number,
  sidechain: NodeRepr_t | number,
  xn: NodeRepr_t | number,
): NodeRepr_t;

export function compress(
  props: OptionalKeyProps,
  attackMs: NodeRepr_t | number,
  releaseMs: NodeRepr_t | number,
  threshold: NodeRepr_t | number,
  ratio: NodeRepr_t | number,
  sidechain: NodeRepr_t | number,
  xn: NodeRepr_t | number,
): NodeRepr_t;

export function compress(a, b, c, d, e, f, g?) {
  if (typeof a === "number" || isNode(a)) {
    return createNode(CompressComposite, {}, [a, b, c, d, e, f]);
  }

  return createNode(CompressComposite, a, [b, c, d, e, f, g]);
}