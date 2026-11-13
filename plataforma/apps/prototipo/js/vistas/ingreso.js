/* EBA Patos y Gansos · ICA — js/vistas/ingreso.js
   Vista de ingreso: perfil, contraseña, verificación en dos pasos y recuperación. */
"use strict";

/* ==========================================================================
   Pantalla de ingreso (con doble factor y bloqueo por intentos)
   ========================================================================== */
function vIngreso(paso) {
  // Un botón por perfil (no por persona): la persona se identifica con su correo.
  const activosDe = (p) => Object.entries(USUARIOS).filter(([, x]) => x.perfil === p && x.estado === "Activo");
  if (!PERFILES[rolElegido]) rolElegido = "inspector";
  const u = (USUARIOS[usuarioIngreso] && USUARIOS[usuarioIngreso].perfil === rolElegido ? USUARIOS[usuarioIngreso] : null) || (activosDe(rolElegido)[0] || [])[1] || { correo: "" };
  const mosaico = ["var(--semilla)", "var(--cosecha)", "var(--siembra)", "var(--campo)", "var(--arena)"].map((c) => `<span style="background:${c}"></span>`).join("");
  const roles = ORDEN_PERFILES.map((p) => `<button type="button" class="rol" data-rol="${p}" aria-pressed="${p === rolElegido}"><strong>${PERFILES[p]}</strong></button>`).join("");
  // Sitio público: no se muestra cuántos usuarios hay ni sus correos. El correo precargado es solo del prototipo de demostración.
  const formIngreso = `
    <h2>Ingresar</h2><p class="muted">Use su correo institucional. Para la demostración, elija un perfil.</p>
    <div class="roles" role="group" aria-label="Perfil de demostración">${roles}</div>
    <form id="f-ingreso" novalidate>
      <div class="campo"><label for="correo">Correo electrónico</label><input id="correo" type="email" autocomplete="username" value="${esc(u.correo)}" required></div>
      <div class="campo"><label for="clave">Contraseña</label>
        <div style="position:relative"><input id="clave" type="password" autocomplete="current-password" value="Ica2026*" required style="padding-right:84px">
        <button type="button" class="btn btn-fantasma btn-chico" id="ver" style="position:absolute;right:4px;top:5px">Mostrar</button></div>
        <span class="ayuda-campo">Contraseña de demostración: Ica2026*</span><span class="error-campo" id="err"></span></div>
      <button class="btn btn-primario" style="width:100%" ${Date.now() < bloqueoHasta ? "disabled" : ""}>Continuar</button>
      <p style="margin-top:12px"><a href="#/recuperar">¿Olvidó su contraseña?</a></p>
    </form>`;
  const formCodigo = `
    <h2>Verificación en dos pasos</h2><p class="muted">Enviamos un código de 6 dígitos a ${esc(u.correo.replace(/^(.).*(@.*)$/, "$1***$2"))}. Vence en 10 minutos.</p>
    <form id="f-codigo" novalidate><div class="codigo">${[0, 1, 2, 3, 4, 5].map((i) => `<input inputmode="numeric" maxlength="1" aria-label="Dígito ${i + 1}">`).join("")}</div>
    <span class="ayuda-campo">Código de demostración: 482073</span><br><span class="error-campo" id="err"></span>
    <div class="acciones" style="justify-content:space-between"><button type="button" class="btn btn-sec" id="volver">Volver</button><button class="btn btn-primario">Verificar</button></div></form>`;
  const formRecuperar = `
    <h2>Recuperar contraseña</h2><p class="muted">Escriba su correo. Si está registrado, recibirá un enlace de un solo uso válido por 30 minutos.</p>
    <form id="f-rec" novalidate><div class="campo"><label for="rc">Correo electrónico</label><input id="rc" type="email" required></div>
    <button class="btn btn-primario" style="width:100%">Enviar enlace</button><p style="margin-top:12px"><a href="#/ingreso">Volver al ingreso</a></p></form>`;
  raiz.innerHTML = `<main class="ingreso">
    <section class="ingreso-marca"><div><img src="img/logo-eba-blanco.svg" alt="EBA Cuac Cuac · Bienestar animal en patos y gansos">
      <h1>Bienestar animal en patos y gansos</h1>
      <p class="bajada">Evaluación en campo con la metodología oficial: recursos, animales y gestión, calificados en una sola visita.</p>
      <div class="mosaico" aria-hidden="true">${mosaico}</div></div><div class="franja" aria-hidden="true"></div></section>
    <section class="ingreso-form"><div class="tarjeta-ingreso"><img src="img/logo-eba-color.svg" alt="" style="width:260px;margin-bottom:22px">
      ${paso === "codigo" ? formCodigo : paso === "recuperar" ? formRecuperar : formIngreso}
      <p class="aviso-seguro">🔒 Conexión cifrada · Sus datos se tratan según la Ley 1581 de 2012.</p></div></section></main>`;
  raiz.querySelectorAll("[data-rol]").forEach((b) => (b.onclick = () => { rolElegido = b.dataset.rol; usuarioIngreso = null; vIngreso(); }));
  const ver = raiz.querySelector("#ver"); if (ver) ver.onclick = () => { const c = raiz.querySelector("#clave"); c.type = c.type === "password" ? "text" : "password"; ver.textContent = c.type === "password" ? "Mostrar" : "Ocultar"; };
  const fi = raiz.querySelector("#f-ingreso");
  if (fi) fi.onsubmit = (e) => {
    e.preventDefault();
    const err = raiz.querySelector("#err"), correo = raiz.querySelector("#correo").value.trim(), clave = raiz.querySelector("#clave").value;
    if (Date.now() < bloqueoHasta) { err.textContent = "Cuenta bloqueada temporalmente. Intente de nuevo en unos minutos."; return; }
    if (!/^\S+@\S+\.\S+$/.test(correo)) { err.textContent = "Escriba un correo válido."; return; }
    const hallado = Object.entries(USUARIOS).find(([, x]) => x.correo.toLowerCase() === correo.toLowerCase() && x.perfil === rolElegido);
    if (hallado && hallado[1].estado !== "Activo" && clave === "Ica2026*") { err.textContent = "Este usuario está inactivo. Comuníquese con el administrador."; return; }
    if (clave !== "Ica2026*" || !hallado) {
      intentos++;
      if (intentos >= 5) { bloqueoHasta = Date.now() + 60000; intentos = 0; err.textContent = "Se superaron 5 intentos. La cuenta queda bloqueada 15 minutos (1 minuto en la demostración)."; vIngreso(); return; }
      err.textContent = `Correo o contraseña incorrectos. Intentos restantes: ${5 - intentos}.`; return;
    }
    intentos = 0; usuarioIngreso = hallado[0]; location.hash = "#/codigo";
  };
  const fc = raiz.querySelector("#f-codigo");
  if (fc) {
    const ins = [...fc.querySelectorAll(".codigo input")];
    ins.forEach((inp, i) => { inp.oninput = () => { inp.value = inp.value.replace(/\D/g, ""); if (inp.value && ins[i + 1]) ins[i + 1].focus(); };
      inp.onkeydown = (e) => { if (e.key === "Backspace" && !inp.value && ins[i - 1]) ins[i - 1].focus(); }; });
    ins[0].focus();
    fc.querySelector("#volver").onclick = () => (location.hash = "#/ingreso");
    fc.onsubmit = (e) => { e.preventDefault(); const c = ins.map((x) => x.value).join("");
      if (c === "482073" && USUARIOS[usuarioIngreso]) iniciarSesion(usuarioIngreso); else raiz.querySelector("#err").textContent = "Código incorrecto. Revise el correo e intente de nuevo."; };
  }
  const fr = raiz.querySelector("#f-rec");
  if (fr) fr.onsubmit = (e) => { e.preventDefault(); toast("Si el correo está registrado, recibirá un enlace en unos minutos."); location.hash = "#/ingreso"; };
}
