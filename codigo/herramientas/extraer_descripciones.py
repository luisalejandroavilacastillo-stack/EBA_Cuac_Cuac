import re, json, sys
txt = open(sys.argv[1], encoding="utf8").read()
# limpiar pies de página y encabezados
lines = txt.split("\n")
clean = []
skip = re.compile(r"^\s*(_{10,}|Instituto Colombiano Agropecuario \(ICA\)|Dirección: Edif|Correo: contactenos|Página web: www\.ica|\d{1,2}\s*$)")
for l in lines:
    if skip.match(l): continue
    clean.append(l)
t = "\n".join(clean)
start = t.find("6.       EVALUACIÓN DE LAS CONDICIONES")
t = t[start:]
# headings
heads = list(re.finditer(r"^\s*(\d\.\d\.\d{1,2})\.\s+(?:Indicador:\s*)?([^\n]+)$", t, re.M))
out = {}
for i, h in enumerate(heads):
    num = h.group(1)
    body = t[h.end(): heads[i+1].start() if i+1 < len(heads) else len(t)]
    m = re.search(r"Descripci[oó]n(?: del indicador| el indicador)?:\s*(.*?)\n\s*(?:c\)|d\)\s*Pregunta)", body, re.S)
    if num == "7.2.1":
        m = re.search(r"Descripci[oó]n del indicador:\s*(.*?)\n\s*d\)\s*Pregunta", body, re.S)
    if not m: print("NO DESC", num, file=sys.stderr); continue
    d = m.group(1)
    d = re.sub(r"\n\s*[a-e]\)\s+", "\n", d)
    d = re.sub("[\uf0b7\uf0a7\uf0d8\uf076]", "•", d)
    d = re.sub(r"\s*\n\s*•\s*", "\n• ", d)
    # join wrapped lines (not bullets)
    parts = d.split("\n")
    res = []
    for p in parts:
        p = re.sub(r"\s+", " ", p).strip()
        if not p: continue
        if p.startswith("•") or not res: res.append(p)
        else: res[-1] += " " + p
    d = "\n".join(res)
    d = d.replace("partos.", "patos.").replace("pomo pescar", "como pescar")
    out[num] = d
json.dump(out, open(sys.argv[2], "w", encoding="utf8"), ensure_ascii=False, indent=1)
print(len(out), "descripciones")
