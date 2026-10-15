'use strict';

// Limite con el tercero: unico lugar que conoce el paquete nativo. El paquete
// es opcional (optionalDependencies); si falta, no carga o su API no coincide,
// devuelve null y la app sigue con el guard JS (fail-open), siempre con log.
const PACKAGE_NAME = '@tiklivetts/rust-chat-guard';
const EXPECTED_API_VERSION = 1;

function loadEngine(logger, engineConfig = {}, requireEngine = require) {
  try {
    return startCompatibleEngine(requireEngine(PACKAGE_NAME), engineConfig);
  } catch (error) {
    return reportUnavailable(logger, error.message);
  }
}

// apiVersion solo se expone en getStatus() de una instancia viva.
function startCompatibleEngine(enginePackage, engineConfig) {
  const engine = new enginePackage.ChatGuard(engineConfig);
  const { apiVersion } = engine.getStatus();
  if (apiVersion !== EXPECTED_API_VERSION) {
    throw new Error(`apiVersion ${apiVersion} incompatible (se espera ${EXPECTED_API_VERSION})`);
  }
  engine.start();
  return engine;
}

function reportUnavailable(logger, cause) {
  logger.log('warn', 'moderacion', 'rust-guard/load-engine.js#loadEngine', 'moderacion.rust.no_disponible',
    'Rust Chat Guard no disponible: la moderacion sigue solo con el guard JS', { cause });
  return null;
}

module.exports = { loadEngine, EXPECTED_API_VERSION };
