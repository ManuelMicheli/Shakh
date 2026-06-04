/**
 * Script inline (eseguito nel <head>, prima dell'idratazione React) che cattura
 * `beforeinstallprompt`: l'evento Chromium scatta molto presto nel caricamento,
 * spesso PRIMA che un listener montato da React esista — andrebbe perso e il
 * bottone Download ricadrebbe sulle istruzioni manuali. Qui lo intercettiamo
 * sincronicamente, lo parcheggiamo su window e avvisiamo la UI con un evento.
 *
 * Va firmato col nonce CSP (come lo script anti-FOUC del tema).
 */
export const installCaptureScript = `(function(){
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    window.__bipEvent = e;
    window.dispatchEvent(new Event('bip:ready'));
  });
  window.addEventListener('appinstalled', function(){
    window.__bipEvent = null;
    window.dispatchEvent(new Event('bip:installed'));
  });
})();`;
