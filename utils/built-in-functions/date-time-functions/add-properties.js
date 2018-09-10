/*
*
*  ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
*  Bangalore, India. All Rights Reserved.
*
*/

/**
   * @constructor
   * @param {!Object} target
   * @param {{apply, construct, get, set}} handler
   */
const Proxy = function (target, handler) { // eslint-disable-line 
    // Fail on unsupported traps: Chrome doesn't do this, but ensure that users of the polyfill
    // are a bit more careful. Copy the internal parts of handler to prevent user changes.
  const unsafeHandler = handler;
  const workHandler = { get: null, set: null, apply: null, construct: null };
  Object.keys(unsafeHandler).forEach((k) => {
    if (!(k in workHandler)) {
      throw new TypeError(`Proxy polyfill does not support trap '${k}'`);
    }
    workHandler[k] = unsafeHandler[k];
  });

  const proxy = this;

  // Create default getters/setters. Create different code paths as handler.get/handler.set can't
  // change after creation.
  const getter = workHandler.get ? function (prop) {
    return workHandler.get(this, prop, proxy);
  } : function (prop) {
    return this[prop];
  };

  const setter = workHandler.set ? function (prop, value) {
    workHandler.set(this, prop, value, proxy);
  } : function (prop, value) {
    this[prop] = value;
  };

  // Clone direct properties (i.e., not part of a prototype).
  const propertyNames = Object.getOwnPropertyNames(target);
  const propertyMap = {};
  propertyNames.forEach((prop) => {
    if (prop in proxy) {
      return;  // ignore properties already here, e.g. 'bind', 'prototype' etc
    }
    const real = Object.getOwnPropertyDescriptor(target, prop);
    const desc = {
      enumerable: !!real.enumerable,
      get: getter.bind(target, prop),
      set: setter.bind(target, prop),
    };
    Object.defineProperty(proxy, prop, desc);
    propertyMap[prop] = true;
  });

  // Set the prototype, and clone all prototype methods (always required if a getter is provided).
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(proxy, Object.getPrototypeOf(target));
  } else if (proxy.__proto__) { // eslint-disable-line 
    proxy.__proto__ = target.__proto__; // eslint-disable-line 
  }

  if (workHandler.get) {
    for (const k in target) {  // eslint-disable-line 
      if (propertyMap[k]) {
        continue;  // eslint-disable-line 
      }
      Object.defineProperty(proxy, k, { get: getter.bind(target, k) });
    }
  }
  return proxy;
};

const addProperties = (obj, props) => {
  const child = Object.create(obj);
  Object.keys(props).forEach((key) => {
    const value = props[key];
    if (typeof value === 'function') {
      Object.defineProperty(child, key, { get: function () { // eslint-disable-line object-shorthand
        const proto = Object.getPrototypeOf(this);
        return value.call(proto);
      },
      });
    } else {
      Object.defineProperty(child, key, { get: function () { // eslint-disable-line object-shorthand
        const proto = Object.getPrototypeOf(this);
        return key !== 'type' && proto[value] ? proto[value]() : value;
      },
      });
    }
  });

  const proxy = new Proxy(child, {
    get: (target, propKey) => {
      const proto = Object.getPrototypeOf(target);
      const protoPropValue = proto[propKey];
      if (!target.hasOwnProperty(propKey) && typeof protoPropValue === 'function') {
        return function (...args) {
          return protoPropValue.apply(proto, args);
        };
      }
      return target[propKey];
    },
  });

  return proxy;
};

module.exports = addProperties;
