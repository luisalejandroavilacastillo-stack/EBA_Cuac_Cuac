/* EBA Patos y Gansos · ICA — js/datos/norma.js
   Datos de la norma: Metodología para evaluar el bienestar animal en patos y gansos, ICA v1.0 (2024). */
const NORMA = [
 {
  "code": "PR01",
  "sp": "pato",
  "g": "MBR",
  "num": "6.1.1",
  "tabla": "5",
  "name": "Alojamiento",
  "q": "¿Los patos cuentan con un lugar de alojamiento?",
  "metodo": "Inspección visual",
  "unidad": "Instalación de alojamiento del predio",
  "prod": "Carne y huevo",
  "cond": "Siempre",
  "trasp": true,
  "formula": "El nivel se calcula con las condiciones observadas, según la descripción de la tabla.",
  "escala": [
   [
    100,
    "Cuenta con alojamiento que da refugio y protección del clima y los depredadores; equipado con comederos, bebederos y nidales; limpio y libre de humedad; con rampas de acceso a las perchas."
   ],
   [
    55,
    "Cuenta con alojamiento que da refugio y protección; no tiene ningún equipamiento; está húmedo y con materia fecal acumulada."
   ],
   [
    0,
    "No cuenta con ninguna instalación de alojamiento o refugio."
   ]
  ],
  "crit": "Alojamiento y espacio",
  "m": {
   "kind": "auto",
   "aux": [
    [
     "Da refugio y protección del clima y de los depredadores",
     "chk"
    ],
    [
     "Equipado con comederos, bebederos y nidales",
     "chk"
    ],
    [
     "Limpio y libre de humedad",
     "chk"
    ],
    [
     "Con rampas de acceso a las perchas",
     "chk"
    ]
   ]
  },
  "app": {}
 },
 {
  "code": "PR02",
  "sp": "pato",
  "g": "MBR",
  "num": "6.1.2",
  "tabla": "6",
  "name": "Calidad de la cama",
  "q": "¿La calidad de la cama es adecuada?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Puñado de cama en cada punto de muestreo de cada galpón",
  "prod": "Carne y huevo",
  "cond": "Solo en corral o galpón con material de cama; no se evalúa si el corral es solo nocturno con piso de cemento, madera o tierra",
  "trasp": true,
  "formula": "puntaje del indicador = promedio de los puntajes de las unidades evaluadas.",
  "escala": [
   [
    100,
    "El material no se compacta con la fuerza aplicada o es granuloso y se desmorona con facilidad."
   ],
   [
    55,
    "Ligeramente compactado por humedad."
   ],
   [
    0,
    "Muy compacto por humedad o imposible tomar el puñado; hay líquido en la mano del evaluador."
   ]
  ],
  "crit": "Cama y nidal",
  "m": {
   "kind": "units",
   "unit": "punto",
   "src": "puntos"
  },
  "app": {
   "cama": true
  }
 },
 {
  "code": "PR03",
  "sp": "pato",
  "g": "MBR",
  "num": "6.1.3",
  "tabla": "7",
  "name": "Integridad de los bebederos",
  "q": "¿La calidad de los bebederos es adecuada?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Bebedero: 2 a 4 más cercanos a cada punto; en traspatio, todos los bebederos",
  "prod": "Carne y huevo",
  "cond": "Siempre; en traspatio los bebederos deben estar a la sombra",
  "trasp": true,
  "formula": "% de bebederos que cumplen = bebederos que cumplen ÷ bebederos inspeccionados × 100. Si no hay bebederos (0 inspeccionados) el indicador queda en 0.",
  "escala": [
   [
    100,
    "Hay bebederos y el 80 % cumple: altura adecuada, sin desperdicio ni derrames, limpio, íntegro y funcional."
   ],
   [
    55,
    "Hay bebederos y entre el 80 % y el 40 % cumple: altura adecuada; los bebederos están sucios, hay desperdicio y derrames."
   ],
   [
    0,
    "No hay bebederos."
   ]
  ],
  "crit": "Agua y bebederos",
  "m": {
   "kind": "pct",
   "total": "Bebederos inspeccionados",
   "part": "Bebederos que cumplen altura, limpieza, integridad y sin derrames",
   "rule": "PR03",
   "extra": null
  },
  "app": {},
  "nota": "La Tabla 7 no da nivel para menos del 40 % de bebederos que cumplen; se asigna 0."
 },
 {
  "code": "PR04",
  "sp": "pato",
  "g": "MBR",
  "num": "6.1.4",
  "tabla": "8",
  "name": "Animales por bebedero",
  "q": "¿Los bebederos garantizan el acceso al agua de bebida de todos los animales?",
  "metodo": "Inspección visual (menos de 200 aves); documental (200 aves o más)",
  "unidad": "Predio: relación animales alojados / bebederos declarados",
  "prod": "Carne y huevo",
  "cond": "Siempre",
  "trasp": true,
  "formula": "Exceso = (aves por bebedero − aves por bebedero declaradas) ÷ declaradas × 100; se compara con el 30 % y con la competencia observada.",
  "escala": [
   [
    100,
    "El número de animales por bebedero está entre 30 % y permite que no exista competencia."
   ],
   [
    55,
    "Está por encima de 30 %, sin embargo no se evidencia competencia."
   ],
   [
    0,
    "Supera en más de un 30 % y hay competencia por el agua."
   ]
  ],
  "crit": "Agua y bebederos",
  "m": {
   "kind": "auto",
   "aux": [
    [
     "Aves alojadas",
     "num"
    ],
    [
     "Bebederos disponibles",
     "num"
    ],
    [
     "Aves por bebedero según el diseño declarado por la granja",
     "num"
    ],
    [
     "Hay competencia por el agua",
     "chk"
    ]
   ]
  },
  "app": {}
 },
 {
  "code": "PR05",
  "sp": "pato",
  "g": "MBR",
  "num": "6.1.5",
  "tabla": "9",
  "name": "Suministro de agua en los bebederos",
  "q": "¿Las aves tienen acceso suficiente al agua?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Bebedero: 2 a 4 más cercanos a cada punto",
  "prod": "Carne y huevo",
  "cond": "Criterio según bebedero artesanal o automatizado",
  "trasp": true,
  "formula": "Puntaje del indicador = promedio de los puntajes de los bebederos evaluados (2 por punto; en traspatio, todos los del predio).",
  "escala": [
   [
    100,
    "Los bebederos tienen agua (artesanales) / presión y flujo constantes o llenado evidente (automatizados)."
   ],
   [
    55,
    "No tienen agua suficiente (artesanales) / presión o flujo fluctuante o goteo (automatizados)."
   ],
   [
    0,
    "No hay suministro de agua (artesanales) / sin presión ni flujo o sin llenado (automatizados)."
   ]
  ],
  "crit": "Agua y bebederos",
  "m": {
   "kind": "units",
   "unit": "bebedero",
   "src": "bebederos"
  },
  "app": {},
  "nota": "La Tabla 9 repite «55 puntos» en la tercera fila («No hay suministro de agua»). Es una errata: el peor caso de toda la metodología vale 0; el prototipo usa 0."
 },
 {
  "code": "PR06",
  "sp": "pato",
  "g": "MBR",
  "num": "6.1.6",
  "tabla": "10",
  "name": "Calidad del agua de bebida",
  "q": "¿Existe protocolo de tratamiento de agua y está implementado? ¿El agua que se suministra está limpia?",
  "metodo": "Inspección visual y documental",
  "unidad": "Fuentes y tanques de agua; bebederos; protocolo y registros",
  "prod": "Carne y huevo",
  "cond": "El protocolo de tratamiento y sus registros solo se exigen con 200 aves o más; en traspatio se califica la fuente y el agua que se ofrece",
  "trasp": true,
  "formula": "Comercial: sin recursos funcionales, sin registros o con agua sucia = 0; con recursos y registros pero sin protocolo completo = 55; todo = 100. Traspatio: agua limpia y apta = 100; agua sucia = 0.",
  "escala": [
   [
    100,
    "Fuentes y tanques limpios y aptos para consumo humano y animal; protocolo de tratamiento con soportes de implementación; recursos e infraestructura funcionales."
   ],
   [
    55,
    "Recursos e infraestructura funcionales y registros de implementación, pero sin protocolo escrito o con protocolo incompleto."
   ],
   [
    0,
    "Cualquiera de: sin infraestructura o recursos; recursos no funcionales; sin registros de implementación; el agua está sucia."
   ]
  ],
  "crit": "Agua y bebederos",
  "m": {
   "kind": "auto",
   "aux": [
    [
     "Recursos e infraestructura funcionales",
     "chk"
    ],
    [
     "Hay registros de implementación del tratamiento",
     "chk"
    ],
    [
     "Fuentes y tanques limpios y el agua apta para consumo",
     "chk"
    ],
    [
     "Protocolo de tratamiento escrito y completo (exigido con 200 aves o más)",
     "chk"
    ]
   ]
  },
  "app": {}
 },
 {
  "code": "PR07",
  "sp": "pato",
  "g": "MBR",
  "num": "6.1.7",
  "tabla": "11",
  "name": "Calidad de los comederos",
  "q": "¿La calidad de los comederos es adecuada?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Comedero",
  "prod": "Carne y huevo",
  "cond": "Siempre; en traspatio los comederos deben estar a la sombra",
  "trasp": true,
  "formula": "Puntaje del indicador = promedio de los puntajes de los comederos evaluados (uno por punto; en traspatio, todos los del predio).",
  "escala": [
   [
    100,
    "Altura suficiente para alimentarse cómodamente; comedero íntegro y limpio."
   ],
   [
    55,
    "Altura suficiente; comedero no íntegro, con deterioro evidente o sucio; expuesto al sol."
   ],
   [
    0,
    "Altura insuficiente; las demás condiciones no cambian la calificación."
   ]
  ],
  "crit": "Alimento y comederos",
  "m": {
   "kind": "units",
   "unit": "comedero",
   "src": "comederos"
  },
  "app": {}
 },
 {
  "code": "PR08",
  "sp": "pato",
  "g": "MBR",
  "num": "6.1.8",
  "tabla": "12",
  "name": "Animales por comedero",
  "q": "¿Los comederos garantizan el acceso al alimento de todos los animales?",
  "metodo": "Inspección visual e inspección documental (solo donde hay más de 200 aves)",
  "unidad": "Predio: relación animales alojados / comederos disponibles",
  "prod": "Carne y huevo",
  "cond": "Siempre",
  "trasp": true,
  "formula": "Exceso = (aves por comedero − aves por comedero declaradas) ÷ declaradas × 100; se compara con el 30 % y con la competencia observada.",
  "escala": [
   [
    100,
    "El número de animales por comedero está entre 30 % y permite que no exista competencia."
   ],
   [
    55,
    "Está por encima de 30 %, sin embargo no se evidencia competencia."
   ],
   [
    0,
    "Supera en más de un 30 % y hay competencia por el alimento."
   ]
  ],
  "crit": "Alimento y comederos",
  "m": {
   "kind": "auto",
   "aux": [
    [
     "Aves alojadas",
     "num"
    ],
    [
     "Comederos disponibles",
     "num"
    ],
    [
     "Aves por comedero según el diseño declarado por la granja",
     "num"
    ],
    [
     "Hay competencia por el alimento",
     "chk"
    ]
   ]
  },
  "app": {}
 },
 {
  "code": "PR09",
  "sp": "pato",
  "g": "MBR",
  "num": "6.1.9",
  "tabla": "13",
  "name": "Medios para contribuir al confort térmico",
  "q": "¿Existen medios para contribuir al confort térmico de los animales?",
  "metodo": "Inspección visual sin muestreo y documental (según el caso)",
  "unidad": "Infraestructura, equipos e insumos del predio",
  "prod": "Carne y huevo",
  "cond": "Siempre",
  "trasp": true,
  "formula": "El nivel se calcula con las condiciones observadas, según la descripción de la tabla.",
  "escala": [
   [
    100,
    "La infraestructura, equipos e insumos existen, están declarados en el POE y son funcionales."
   ],
   [
    55,
    "Existen y son funcionales, pero no están declarados en el POE."
   ],
   [
    0,
    "No existen o no son funcionales."
   ]
  ],
  "crit": "Confort térmico",
  "m": {
   "kind": "auto",
   "aux": [
    [
     "Existen infraestructura, equipos e insumos para el confort térmico",
     "chk"
    ],
    [
     "Son funcionales",
     "chk"
    ],
    [
     "Están declarados en el POE (exigido con 200 aves o más)",
     "chk"
    ]
   ]
  },
  "app": {}
 },
 {
  "code": "PR10",
  "sp": "pato",
  "g": "MBR",
  "num": "6.1.10",
  "tabla": "14",
  "name": "Calidad, integridad y funcionalidad del nidal",
  "q": "¿Los nidales se encuentran íntegros y funcionales para estimular la ovoposición?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Nidal más cercano a cada punto",
  "prod": "Ficha: carne y huevo. Tabla 4: solo huevo",
  "cond": "Siempre",
  "trasp": true,
  "formula": "puntaje del indicador = promedio de los puntajes de las unidades evaluadas.",
  "escala": [
   [
    100,
    "Nidales individuales y colectivos con integridad estructural y presencia de cama."
   ],
   [
    55,
    "Individuales: condiciones no ideales (sin cama, envejecidos) pero funcionales. Colectivos: integridad y aislamiento visual no ideales pero funcionales."
   ],
   [
    0,
    "No hay nidales; individuales no íntegros (sin piso) o en mal estado; colectivos fracturados sin aislamiento visual."
   ]
  ],
  "crit": "Cama y nidal",
  "m": {
   "kind": "units",
   "unit": "nidal",
   "src": "puntos"
  },
  "app": {
   "proposito": "huevo"
  }
 },
 {
  "code": "PR11",
  "sp": "pato",
  "g": "MBR",
  "num": "6.1.11",
  "tabla": "Sin número y 15",
  "name": "Espacio disponible para patos",
  "q": "¿Cuál es el espacio disponible para las aves?",
  "metodo": "Inspección visual con muestreo y documental (200 patos o más)",
  "unidad": "Galpón o corral; en pastoreo, suma de corral, corrales exteriores y pocetas",
  "prod": "Carne y huevo",
  "cond": "Siempre",
  "trasp": true,
  "formula": "Densidad (kg/m²) = número de aves × peso promedio (kg) ÷ área útil (m²). Se compara con la densidad máxima de la tabla de 6.1.11 para ese peso; entre dos pesos de la tabla se interpola de forma lineal.",
  "escala": [
   [
    100,
    "La densidad está dentro de la escala (menor o igual a la densidad máxima para el peso de las aves)."
   ],
   [
    0,
    "La densidad está por fuera de la escala (mayor que la densidad máxima)."
   ]
  ],
  "crit": "Alojamiento y espacio",
  "m": {
   "kind": "density"
  },
  "app": {},
  "nota": "La Tabla 15 remite a la «tabla 5», pero la tabla de densidades es la que aparece sin número en 6.1.11. Para pesos entre filas se interpola (p. ej. 2,2 kg → 18,8 kg/m²); con menos de 1,5 kg se usa 17 y con más de 4,5 kg, 24."
 },
 {
  "code": "PR12",
  "sp": "pato",
  "g": "MBR",
  "num": "6.1.12",
  "tabla": "16",
  "name": "Pocetas, estanques o lagos",
  "q": "¿Tienen los patos un espacio para nadar?",
  "metodo": "Inspección visual sin muestreo",
  "unidad": "Pocetas, estanques o lagos del predio",
  "prod": "Carne y huevo",
  "cond": "Siempre",
  "trasp": true,
  "formula": "El nivel se calcula con las condiciones observadas, según la descripción de la tabla.",
  "escala": [
   [
    100,
    "Existe un lugar para nadar con profundidad de 10 cm o más, con rampas de ingreso y salida y sin encharcamientos."
   ],
   [
    55,
    "Existe un lugar con profundidad de 10 cm o más, pero sin alguna de las rampas; presenta encharcamientos."
   ],
   [
    0,
    "No existe un lugar en el que los patos puedan nadar."
   ]
  ],
  "crit": "Pocetas y estanques",
  "m": {
   "kind": "auto",
   "aux": [
    [
     "Existe un lugar para nadar (poceta, estanque o lago)",
     "chk"
    ],
    [
     "Profundidad (cm)",
     "num"
    ],
    [
     "Rampa de ingreso",
     "chk"
    ],
    [
     "Rampa de salida",
     "chk"
    ],
    [
     "Presenta encharcamientos",
     "chk"
    ]
   ]
  },
  "app": {}
 },
 {
  "code": "PA01",
  "sp": "pato",
  "g": "MBA",
  "num": "6.2.1",
  "tabla": "17",
  "name": "Jadeo",
  "q": "¿Las aves presentan jadeo?",
  "metodo": "Inspección visual sin muestreo",
  "unidad": "Grupo de aves observado desde fuera y desde el centro del galpón",
  "prod": "Carne y huevo",
  "cond": "Solo en predios donde los patos permanecen todo el tiempo en corral o galpón; se correlaciona con 6.1.9",
  "trasp": true,
  "formula": "% de jadeo = aves con jadeo / aves observadas × 100.",
  "escala": [
   [
    100,
    "Porcentaje de jadeo menor o igual al 40 %."
   ],
   [
    55,
    "Mayor al 40 % y menor o igual a 60 %."
   ],
   [
    0,
    "Mayor al 60 %."
   ]
  ],
  "crit": "Comportamiento y estrés térmico",
  "m": {
   "kind": "pct",
   "total": "Aves observadas",
   "part": "Aves con jadeo",
   "rule": "PA01",
   "extra": null
  },
  "app": {
   "permanencia": true
  }
 },
 {
  "code": "PA02",
  "sp": "pato",
  "g": "MBA",
  "num": "6.2.2",
  "tabla": "18",
  "name": "Acurrucarse en grupos (amontonamiento)",
  "q": "¿Las aves presentan amontonamiento?",
  "metodo": "Inspección visual sin muestreo",
  "unidad": "Grupo de aves al momento de la inspección",
  "prod": "Carne y huevo",
  "cond": "Siempre",
  "trasp": true,
  "formula": "% = aves amontonadas / aves observadas × 100.",
  "escala": [
   [
    100,
    "Amontonamiento ≤ 40 %."
   ],
   [
    55,
    "Más de 40 % y menos de 60 %."
   ],
   [
    0,
    "60 % o más."
   ]
  ],
  "crit": "Comportamiento y estrés térmico",
  "m": {
   "kind": "pct",
   "total": "Aves observadas",
   "part": "Aves amontonadas",
   "rule": "PA02",
   "extra": null
  },
  "app": {},
  "nota": "La Tabla 18 escribe «> 40 o ≤ 60» y «≥ 60 %»: el 60 % queda en dos niveles. Se aplica la fila de 0 puntos (≥ 60 %)."
 },
 {
  "code": "PA03",
  "sp": "pato",
  "g": "MBA",
  "num": "6.2.3",
  "tabla": "19",
  "name": "Integridad del hueso de la quilla",
  "q": "¿Cuál es el nivel de daño en aves con deformidades o desviación de la quilla?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Ave de la muestra",
  "prod": "Carne y huevo",
  "cond": "Siempre",
  "trasp": true,
  "formula": "puntaje del indicador = promedio de los puntajes de las unidades evaluadas.",
  "escala": [
   [
    100,
    "Ausente. Sin anormalidades ni pérdida de la forma recta o normal de la quilla."
   ],
   [
    55,
    "Leve. Inicio de desviación (fractura, callosidad o indicios de curvatura)."
   ],
   [
    0,
    "Severo. Desviación evidente a la vista y a la palpación."
   ]
  ],
  "crit": "Salud e integridad física",
  "m": {
   "kind": "units",
   "unit": "ave",
   "src": "aves"
  },
  "app": {}
 },
 {
  "code": "PA04",
  "sp": "pato",
  "g": "MBA",
  "num": "6.2.4",
  "tabla": "20",
  "name": "Podo dermatitis",
  "q": "¿Las aves presentan podo dermatitis y qué nivel de afectación tienen?",
  "metodo": "Inspección visual con muestreo (pies limpios y buena luz)",
  "unidad": "Ave de la muestra",
  "prod": "Carne y huevo",
  "cond": "Siempre",
  "trasp": true,
  "formula": "puntaje del indicador = promedio de los puntajes de las unidades evaluadas.",
  "escala": [
   [
    100,
    "Ausente. Sin inflamación, lesiones ni dolor en la almohadilla plantar o la membrana interdigital."
   ],
   [
    55,
    "Leve. Heridas o inflamación leve, sin señales de dolor evidente."
   ],
   [
    0,
    "Severo. Fibromas, inflamación severa y señales de dolor evidentes."
   ]
  ],
  "crit": "Salud e integridad física",
  "m": {
   "kind": "units",
   "unit": "ave",
   "src": "aves"
  },
  "app": {}
 },
 {
  "code": "PA05",
  "sp": "pato",
  "g": "MBA",
  "num": "6.2.5",
  "tabla": "21",
  "name": "Daño en los dedos",
  "q": "¿Qué nivel de daño hay en los dedos de los animales?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Ave de la muestra",
  "prod": "Carne y huevo",
  "cond": "Siempre",
  "trasp": true,
  "formula": "puntaje del indicador = promedio de los puntajes de las unidades evaluadas.",
  "escala": [
   [
    100,
    "Sin anormalidades ni pérdida de integridad en los dedos."
   ],
   [
    55,
    "Heridas, inflamaciones articulares, amputaciones o pérdida de tejido ungueal, sin dolor evidente."
   ],
   [
    0,
    "Lo mismo, con señales de dolor evidentes."
   ]
  ],
  "crit": "Salud e integridad física",
  "m": {
   "kind": "units",
   "unit": "ave",
   "src": "aves"
  },
  "app": {}
 },
 {
  "code": "PA06",
  "sp": "pato",
  "g": "MBA",
  "num": "6.2.6",
  "tabla": "22",
  "name": "Lesiones en piel y otros tegumentos",
  "q": "¿Se observan lesiones en la piel u otros tegumentos?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Ave de la muestra",
  "prod": "Carne y huevo",
  "cond": "Siempre",
  "trasp": true,
  "formula": "puntaje del indicador = promedio de los puntajes de las unidades evaluadas.",
  "escala": [
   [
    100,
    "Sin lesiones o hasta 2 rasguños o lesiones activas de no más de 0,5 cm cada una; sin prolapso."
   ],
   [
    55,
    "Sin prolapso, pero al menos una lesión de 0,5 a 2,0 cm, o 3 o más rasguños de no más de 0,5 cm."
   ],
   [
    0,
    "Una o más lesiones de 2 cm o más, o prolapso de cloaca."
   ]
  ],
  "crit": "Salud e integridad física",
  "m": {
   "kind": "units",
   "unit": "ave",
   "src": "aves"
  },
  "app": {}
 },
 {
  "code": "PA07",
  "sp": "pato",
  "g": "MBA",
  "num": "6.2.7",
  "tabla": "23",
  "name": "Suciedad y apariencia del plumaje",
  "q": "¿Cuál es la apariencia y el estado de suciedad del plumaje?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Ave de la muestra",
  "prod": "Carne y huevo",
  "cond": "Siempre; no se toma en cuenta la suciedad de la cloaca",
  "trasp": true,
  "formula": "puntaje del indicador = promedio de los puntajes de las unidades evaluadas.",
  "escala": [
   [
    100,
    "Plumaje homogéneo, acorde al color de la raza, raquis desarrollado, plumas planas, largas y ordenadas, sin áreas desprovistas."
   ],
   [
    55,
    "La misma descripción del nivel 100, más algunas zonas con plumas quebradas o desordenadas, sin brillo."
   ],
   [
    0,
    "Plumaje no acorde a la raza, raquis quebrantado, plumas desordenadas o erizadas, pérdida de continuidad del manto."
   ]
  ],
  "crit": "Salud e integridad física",
  "m": {
   "kind": "units",
   "unit": "ave",
   "src": "aves"
  },
  "app": {}
 },
 {
  "code": "PA08",
  "sp": "pato",
  "g": "MBA",
  "num": "6.2.8",
  "tabla": "24",
  "name": "Integridad óculo-nasal",
  "q": "¿Cuántos animales tienen descarga nasal u ocular, o lesiones en esas áreas?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Ave de la muestra",
  "prod": "Carne y huevo",
  "cond": "Siempre",
  "trasp": true,
  "formula": "puntaje del indicador = promedio de los puntajes de las unidades evaluadas.",
  "escala": [
   [
    100,
    "Sin descargas óculo-nasales, carnosidades oculares ni lesiones agudas o crónicas."
   ],
   [
    55,
    "Sin carnosidades ni lesiones, pero con descarga nasal u ocular (una de las dos)."
   ],
   [
    0,
    "Descarga nasal y ocular, o carnosidades oculares con o sin dolor, o lesiones agudas o crónicas."
   ]
  ],
  "crit": "Salud e integridad física",
  "m": {
   "kind": "units",
   "unit": "ave",
   "src": "aves"
  },
  "app": {}
 },
 {
  "code": "PA09",
  "sp": "pato",
  "g": "MBA",
  "num": "6.2.9",
  "tabla": "25",
  "name": "Condición del pico",
  "q": "¿Cuál es el nivel de daño asociado a la condición del pico?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Ave de la muestra",
  "prod": "Carne y huevo",
  "cond": "Siempre",
  "trasp": true,
  "formula": "puntaje del indicador = promedio de los puntajes de las unidades evaluadas.",
  "escala": [
   [
    100,
    "No presenta lesiones de ningún tipo."
   ],
   [
    55,
    "Tiene una lesión que no causa dolor ni impide comer y acicalarse."
   ],
   [
    0,
    "Presenta lesiones que le causan dolor."
   ]
  ],
  "crit": "Salud e integridad física",
  "m": {
   "kind": "units",
   "unit": "ave",
   "src": "aves"
  },
  "app": {}
 },
 {
  "code": "PA10",
  "sp": "pato",
  "g": "MBA",
  "num": "6.2.10",
  "tabla": "26",
  "name": "Mortalidad",
  "q": "¿Cuál es la tasa de mortalidad acumulada?",
  "metodo": "Inspección documental",
  "unidad": "Registros de mortalidad de los últimos 5 ciclos",
  "prod": "Carne y huevo",
  "cond": "Solo en sistemas con 200 aves o más; excluye eutanasia, entresaques y lotes con situaciones extraordinarias",
  "trasp": false,
  "formula": "% mortalidad acumulada = aves muertas / aves alojadas × 100 (últimos 5 ciclos).",
  "escala": [
   [
    100,
    "Mortalidad acumulada menor del 12 %."
   ],
   [
    55,
    "Desde el 12 % y menor del 14 %."
   ],
   [
    0,
    "14 % o más."
   ]
  ],
  "crit": "Mortalidad",
  "m": {
   "kind": "pct",
   "total": "Aves alojadas (últimos 5 ciclos)",
   "part": "Aves muertas (sin eutanasia ni entresaques)",
   "rule": "PA10",
   "extra": null
  },
  "app": {},
  "nota": "La Tabla 26 escribe «≥12» para 100 puntos, «≤12 y ≥14» para 55 y «≥14» para 0. Se interpreta: < 12 % = 100; de 12 % a menos de 14 % = 55; ≥ 14 % = 0 (antes el 14 % quedaba en 55)."
 },
 {
  "code": "PA11",
  "sp": "pato",
  "g": "MBA",
  "num": "6.2.11",
  "tabla": "27 y 28",
  "name": "Condición corporal",
  "q": "¿Cuál es la condición corporal general del ave?",
  "metodo": "Inspección visual con muestreo y palpación (Ilustración 5)",
  "unidad": "Ave de la muestra",
  "prod": "Carne y huevo",
  "cond": "Escala distinta para carne (Tabla 27) y huevo (Tabla 28)",
  "trasp": true,
  "formula": "Cada ave se puntúa de 1 a 5 (Ilustración 5) y se convierte con la Tabla 27 o 28; puntaje del indicador = promedio de las aves evaluadas.",
  "escala": [
   [
    100,
    "Carne: puntuación 3 o 4 · Huevo: puntuación 2 o 3"
   ],
   [
    55,
    "Carne: puntuación 2 · Huevo: puntuación 4"
   ],
   [
    0,
    "Carne: puntuación 1 o 5 · Huevo: puntuación 1 o 5"
   ]
  ],
  "crit": "Estado nutricional",
  "m": {
   "kind": "cc",
   "unit": "ave",
   "src": "aves"
  },
  "app": {},
  "nota": "La Tabla 28 (huevo) escribe «5 punto» para la puntuación 4: es 55, como en el resto de la metodología."
 },
 {
  "code": "PG01",
  "sp": "pato",
  "g": "MBG",
  "num": "6.3.1",
  "tabla": "29",
  "name": "Calidad del agua de bebida",
  "q": "¿Las aves cuentan con agua de calidad para su consumo?",
  "metodo": "Inspección documental",
  "unidad": "Certificado o informe de laboratorio",
  "prod": "Carne y huevo",
  "cond": "Solo en sistemas con 200 aves o más",
  "trasp": false,
  "formula": "Cumple / no cumple.",
  "escala": [
   [
    100,
    "Cumple: certificado o informe de análisis fisicoquímico y microbiológico (negativos) de la fuente; laboratorio autorizado, vigencia de un año, membrete y firma; ante hallazgos positivos, evidencia de medidas correctivas."
   ],
   [
    0,
    "No existe el análisis; el certificado está vencido y sin firma o membrete; ante hallazgos, no hay medidas correctivas."
   ]
  ],
  "crit": "Agua y alimentación",
  "m": {
   "kind": "doc",
   "prof": false
  },
  "app": {}
 },
 {
  "code": "PG02",
  "sp": "pato",
  "g": "MBG",
  "num": "6.3.2",
  "tabla": "30",
  "name": "Alimentación equilibrada",
  "q": "¿Las aves cuentan con alimentación equilibrada?",
  "metodo": "Inspección documental",
  "unidad": "Facturas, notas de recepción o etiqueta del empaque",
  "prod": "Carne y huevo",
  "cond": "Solo en sistemas con 200 aves o más",
  "trasp": false,
  "formula": "Cumple / no cumple.",
  "escala": [
   [
    100,
    "Soporte del alimento acorde a la etapa fisiológica y proveniente de planta registrada ante el ICA."
   ],
   [
    0,
    "No existe documento que demuestre que el alimento es apropiado para la etapa fisiológica."
   ]
  ],
  "crit": "Agua y alimentación",
  "m": {
   "kind": "doc",
   "prof": false
  },
  "app": {}
 },
 {
  "code": "PG03",
  "sp": "pato",
  "g": "MBG",
  "num": "6.3.3",
  "tabla": "31",
  "name": "Programas de vigilancia y gestión sanitaria",
  "q": "¿Existe participación en las medidas de bioseguridad y en la prevención, control y erradicación de enfermedades del ICA?",
  "metodo": "Inspección documental",
  "unidad": "Plan, procedimiento o documento",
  "prod": "Carne y huevo",
  "cond": "Solo en sistemas con 200 aves o más",
  "trasp": false,
  "formula": "Cumple / no cumple.",
  "escala": [
   [
    100,
    "Existe el plan, procedimiento o documento para control y erradicación de enfermedades de control oficial."
   ],
   [
    0,
    "No existe."
   ]
  ],
  "crit": "Sanidad",
  "m": {
   "kind": "doc",
   "prof": false
  },
  "app": {}
 },
 {
  "code": "PG04",
  "sp": "pato",
  "g": "MBG",
  "num": "6.3.4",
  "tabla": "32",
  "name": "Procedimiento Operativo Estandarizado (POE-Bienestar animal)",
  "q": "¿La granja cuenta con POE de bienestar animal o un capítulo en un POE existente?",
  "metodo": "Inspección documental",
  "unidad": "POE firmado",
  "prod": "Carne y huevo",
  "cond": "Solo en sistemas con 200 aves o más",
  "trasp": false,
  "formula": "Cumple / no cumple.",
  "escala": [
   [
    100,
    "Incluye como mínimo vacunación, densidades, manejo de enfermos y prácticas para reducir el dolor; firmado por MV, MVZ o Z con matrícula vigente."
   ],
   [
    0,
    "No cuenta con el contenido mínimo o no está firmado por MV, MVZ o Z."
   ]
  ],
  "crit": "Procedimientos de bienestar",
  "m": {
   "kind": "doc",
   "prof": true
  },
  "app": {}
 },
 {
  "code": "PG05",
  "sp": "pato",
  "g": "MBG",
  "num": "6.3.5",
  "tabla": "33",
  "name": "Condiciones térmicas diarias y manejo de emergencias",
  "q": "¿Se realiza monitoreo diario y existe un protocolo de procedimientos de emergencia?",
  "metodo": "Inspección documental",
  "unidad": "Protocolo en el POE",
  "prod": "Carne y huevo",
  "cond": "Solo en sistemas con 200 aves o más",
  "trasp": false,
  "formula": "Cumple / no cumple.",
  "escala": [
   [
    100,
    "Protocolo de emergencias térmicas en el POE con estrategias, procedimientos, equipos e insumos; elaborado y firmado por MV, MVZ o Z con matrícula vigente."
   ],
   [
    0,
    "No cuenta con el protocolo o no cumple los requisitos."
   ]
  ],
  "crit": "Procedimientos de bienestar",
  "m": {
   "kind": "doc",
   "prof": true
  },
  "app": {}
 },
 {
  "code": "PG06",
  "sp": "pato",
  "g": "MBG",
  "num": "6.3.6",
  "tabla": "34",
  "name": "Programa de iluminación",
  "q": "¿Existe un programa de manejo del régimen de luz y oscuridad?",
  "metodo": "Inspección documental",
  "unidad": "Programa y protocolo",
  "prod": "Carne y huevo",
  "cond": "Solo en sistemas con 200 aves o más",
  "trasp": false,
  "formula": "Cumple / no cumple.",
  "escala": [
   [
    100,
    "Programa de luz y oscuridad de 24 horas específico para la granja y protocolo ante cambios abruptos de iluminación con estrategias, equipos e insumos; elaborado y firmado por MV, MVZ o Z con matrícula vigente."
   ],
   [
    0,
    "No existe evidencia del programa o del protocolo."
   ]
  ],
  "crit": "Procedimientos de bienestar",
  "m": {
   "kind": "doc",
   "prof": true
  },
  "app": {}
 },
 {
  "code": "PG07",
  "sp": "pato",
  "g": "MBG",
  "num": "6.3.7",
  "tabla": "35",
  "name": "Capacitación básica en bienestar animal",
  "q": "¿El personal que maneja los patos cuenta con constancia de aprobación del curso en bienestar animal?",
  "metodo": "Inspección documental",
  "unidad": "Certificados del personal",
  "prod": "Carne y huevo",
  "cond": "Solo en sistemas con 200 aves o más",
  "trasp": false,
  "formula": "Cumple / no cumple.",
  "escala": [
   [
    100,
    "Certificado de asistencia y aprobación para todo el personal que maneja animales, expedido por ICA, SENA, profesionales con experiencia soportada u otras entidades del plan del ICA."
   ],
   [
    0,
    "No hay evidencia, no todo el personal está certificado o el certificado no proviene de una entidad válida."
   ]
  ],
  "crit": "Capacitación",
  "m": {
   "kind": "doc",
   "prof": false
  },
  "app": {}
 },
 {
  "code": "PG08",
  "sp": "pato",
  "g": "MBG",
  "num": "6.3.8",
  "tabla": "36",
  "name": "Protocolo de sacrificio humanitario o eutanasia",
  "q": "¿Existe un protocolo de sacrificio humanitario o eutanasia?",
  "metodo": "Inspección documental",
  "unidad": "Protocolo en formato de ficha técnica",
  "prod": "Carne y huevo",
  "cond": "Solo en sistemas con 200 aves o más",
  "trasp": false,
  "formula": "Cumple / no cumple.",
  "escala": [
   [
    100,
    "Indicaciones del método, procedimiento y criterios, compromiso ético y tipos de emergencia; elaborado y firmado por MV, MVZ o Z con matrícula vigente; basado en el título 7 del Código de la OMSA; formato de ficha técnica."
   ],
   [
    0,
    "No existe, no está firmado por profesional con matrícula o no se basa en el título 7 de la OMSA."
   ]
  ],
  "crit": "Sacrificio humanitario",
  "m": {
   "kind": "doc",
   "prof": true
  },
  "app": {}
 },
 {
  "code": "PG09",
  "sp": "pato",
  "g": "MBG",
  "num": "6.3.9",
  "tabla": "37",
  "name": "Capacitación en técnicas de sacrificio humanitario o eutanasia",
  "q": "¿El personal cuenta con acreditación y constancia de capacitación en técnicas de sacrificio humanitario?",
  "metodo": "Inspección documental",
  "unidad": "Certificados o matrícula profesional",
  "prod": "Carne y huevo",
  "cond": "Solo en sistemas con 200 aves o más",
  "trasp": false,
  "formula": "Cumple / no cumple.",
  "escala": [
   [
    100,
    "Si lo realiza personal que no es MV ni MVZ, certificado de capacitación de todo el personal; si lo realiza MV, MVZ o Z, basta verificar la matrícula vigente."
   ],
   [
    0,
    "No hay evidencia de capacitación, o el profesional encargado no tiene matrícula vigente."
   ]
  ],
  "crit": "Capacitación",
  "m": {
   "kind": "doc",
   "prof": true
  },
  "app": {}
 },
 {
  "code": "PG10",
  "sp": "pato",
  "g": "MBG",
  "num": "6.3.10",
  "tabla": "38",
  "name": "Uso responsable de medicamentos e insumos veterinarios",
  "q": "¿Se cumple con las buenas prácticas para el uso de medicamentos veterinarios?",
  "metodo": "Inspección documental y visual de la bodega",
  "unidad": "Registros de tratamientos y bodega de medicamentos",
  "prod": "Carne y huevo",
  "cond": "Solo en sistemas con 200 aves o más",
  "trasp": false,
  "formula": "Verificación de las BPUMV listadas en la ficha.",
  "escala": [
   [
    100,
    "Se cumple con todas las BPUMV."
   ],
   [
    55,
    "Como mínimo: medicamentos con registro ICA, prescritos por MV o MVZ, registro de tratamientos y sin medicamentos vencidos."
   ],
   [
    0,
    "Cualquiera de: medicamentos sin registro ICA, sustancias prohibidas, sin prescripción de MV o MVZ, sin registro de tratamientos."
   ]
  ],
  "crit": "Medicamentos",
  "m": {
   "kind": "bpumv",
   "mode": "pato"
  },
  "app": {}
 },
 {
  "code": "GR01",
  "sp": "ganso",
  "g": "MBR",
  "num": "7.1.1",
  "tabla": "40",
  "name": "Suministro de alimento",
  "q": "¿Los alimentos están en buenas condiciones, son acordes a la especie, tienen registro ICA y se almacenan con buenas prácticas?",
  "metodo": "Inspección visual de comederos, bodegas y etiquetas",
  "unidad": "Comederos, bodega y empaques",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Siempre",
  "trasp": true,
  "formula": "El nivel se calcula con las condiciones observadas, según la descripción de la tabla.",
  "escala": [
   [
    100,
    "Alimento en buen estado, dieta balanceada por zootecnista o nutricionista; alimentos comerciales con registro ICA; buenas prácticas de almacenamiento."
   ],
   [
    55,
    "Sin dieta balanceada por profesional, pero el alimento está en buenas condiciones y es adecuado para la especie."
   ],
   [
    0,
    "Alimento en malas condiciones o inadecuado; alimentos comerciales sin registro ICA o mal almacenados."
   ]
  ],
  "crit": "Alimento y comederos",
  "m": {
   "kind": "auto",
   "aux": [
    [
     "Alimento en buen estado y adecuado para la especie",
     "chk"
    ],
    [
     "Dieta balanceada por zootecnista o nutricionista",
     "chk"
    ],
    [
     "Alimentos comerciales con registro ICA",
     "chk"
    ],
    [
     "Buenas prácticas de almacenamiento",
     "chk"
    ]
   ]
  },
  "app": {}
 },
 {
  "code": "GR02",
  "sp": "ganso",
  "g": "MBR",
  "num": "7.1.2",
  "tabla": "41",
  "name": "Suministro y acceso al agua",
  "q": "¿Los animales disponen de acceso permanente al agua en todos los bebederos a evaluar?",
  "metodo": "Inspección visual con muestreo y recorrido",
  "unidad": "Ganso de la muestra; bebederos de los galpones o potreros",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Siempre",
  "trasp": true,
  "formula": "% = gansos evaluados con acceso permanente / gansos evaluados × 100.",
  "escala": [
   [
    100,
    "Todos los animales evaluados tienen acceso permanente al agua."
   ],
   [
    55,
    "Al menos el 80 % de los gansos evaluados tiene acceso permanente."
   ],
   [
    0,
    "Menos del 80 % de los gansos evaluados no tiene acceso permanente."
   ]
  ],
  "crit": "Agua y bebederos",
  "m": {
   "kind": "pct",
   "total": "Gansos evaluados",
   "part": "Gansos con acceso permanente al agua",
   "rule": "GR02",
   "extra": null
  },
  "app": {}
 },
 {
  "code": "GR03",
  "sp": "ganso",
  "g": "MBR",
  "num": "7.1.3",
  "tabla": "42",
  "name": "Estado y limpieza de los comederos",
  "q": "¿Cuál es el estado y la limpieza de los comederos?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Comedero",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Siempre",
  "trasp": true,
  "formula": "% = comederos en buen estado, limpios y sin riesgo / comederos inspeccionados × 100.",
  "escala": [
   [
    100,
    "Todos los comederos en buen estado, limpios y sin riesgo de lesión."
   ],
   [
    55,
    "Al menos el 80 %."
   ],
   [
    20,
    "Entre el 60 % y el 79 %."
   ],
   [
    0,
    "Menos del 60 % de los comederos no están en buen estado, están sucios y generan riesgo."
   ]
  ],
  "crit": "Alimento y comederos",
  "m": {
   "kind": "pct",
   "total": "Comederos inspeccionados",
   "part": "Comederos en buen estado, limpios y sin riesgo",
   "rule": "GR03",
   "extra": null
  },
  "app": {}
 },
 {
  "code": "GR04",
  "sp": "ganso",
  "g": "MBR",
  "num": "7.1.4",
  "tabla": "43",
  "name": "Estado y limpieza de los bebederos",
  "q": "¿Cuál es el estado y la limpieza del bebedero?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Bebedero",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Siempre",
  "trasp": true,
  "formula": "% = bebederos en buen estado, limpios y sin riesgo / bebederos inspeccionados × 100.",
  "escala": [
   [
    100,
    "Todos los bebederos en buen estado, limpios y sin riesgo de lesión."
   ],
   [
    55,
    "Al menos el 80 %."
   ],
   [
    20,
    "Entre el 60 % y el 79 %."
   ],
   [
    0,
    "Menos del 60 % de los bebederos no están en buen estado, están sucios y generan riesgo."
   ]
  ],
  "crit": "Agua y bebederos",
  "m": {
   "kind": "pct",
   "total": "Bebederos inspeccionados",
   "part": "Bebederos en buen estado, limpios y sin riesgo",
   "rule": "GR03",
   "extra": null
  },
  "app": {}
 },
 {
  "code": "GR05",
  "sp": "ganso",
  "g": "MBR",
  "num": "7.1.5",
  "tabla": "44",
  "name": "Limpieza del galpón y/o potrero",
  "q": "¿Los galpones o potreros presentan elementos que puedan generar algún riesgo?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Galpón o potrero",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Siempre",
  "trasp": true,
  "formula": "% = galpones o potreros con elementos de riesgo / galpones o potreros inspeccionados × 100.",
  "escala": [
   [
    100,
    "Ningún galpón o potrero presenta elementos de riesgo (0 %)."
   ],
   [
    55,
    "Menos del 20 % presenta elementos de riesgo."
   ],
   [
    20,
    "Entre el 20 % y el 40 % presenta elementos de riesgo."
   ],
   [
    0,
    "Más del 40 % presenta elementos de riesgo."
   ]
  ],
  "crit": "Limpieza de instalaciones",
  "m": {
   "kind": "pct",
   "total": "Galpones o potreros inspeccionados",
   "part": "Con elementos de riesgo",
   "rule": "GR05",
   "extra": null
  },
  "app": {},
  "nota": "En la Tabla 44 los niveles 55 y 20 están invertidos (menos riesgo daría menos puntos). El prototipo aplica el orden lógico: < 20 % = 55 y 20–40 % = 20."
 },
 {
  "code": "GR06",
  "sp": "ganso",
  "g": "MBR",
  "num": "7.1.6",
  "tabla": "45",
  "name": "Presencia de estanques, lagos o espejos de agua",
  "q": "¿Los gansos tienen acceso permanente a estanques, lagos o espejos de agua?",
  "metodo": "Inspección visual con muestreo y recorrido",
  "unidad": "Estanques del predio",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Siempre",
  "trasp": true,
  "formula": "Cumple: 100 · No cumple: 0.",
  "escala": [
   [
    100,
    "Tienen acceso permanente a estanques, lagos o espejos de agua."
   ],
   [
    0,
    "No tienen acceso."
   ]
  ],
  "crit": "Estanques",
  "m": {
   "kind": "radio",
   "opts": [
    [
     "Tienen acceso permanente a estanques, lagos o espejos de agua",
     100
    ],
    [
     "No tienen acceso",
     0
    ]
   ]
  },
  "app": {}
 },
 {
  "code": "GR07",
  "sp": "ganso",
  "g": "MBR",
  "num": "7.1.7",
  "tabla": "46",
  "name": "Protección ante condiciones ambientales",
  "q": "¿Las instalaciones ofrecen protección ante condiciones ambientales y de riesgo frente a los depredadores?",
  "metodo": "Inspección visual",
  "unidad": "Instalaciones; en sistemas extensivos, refugio, zona arbolada o cubierto",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Siempre",
  "trasp": true,
  "formula": "Cumple: 100 · No cumple: 0.",
  "escala": [
   [
    100,
    "Las instalaciones ofrecen protección ante condiciones ambientales y depredadores."
   ],
   [
    0,
    "No hay instalaciones que ofrezcan esa protección."
   ]
  ],
  "crit": "Protección ambiental",
  "m": {
   "kind": "radio",
   "opts": [
    [
     "Las instalaciones protegen de las condiciones ambientales y de los depredadores",
     100
    ],
    [
     "No hay instalaciones que ofrezcan esa protección",
     0
    ]
   ]
  },
  "app": {}
 },
 {
  "code": "GA01",
  "sp": "ganso",
  "g": "MBA",
  "num": "7.2.1",
  "tabla": "47",
  "name": "Presencia, severidad y tratamiento de heridas o lesiones",
  "q": "¿Los gansos tienen heridas o lesiones graves o profundas? ¿Las heridas son tratadas?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Ganso de la muestra",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Herida grave: al menos una herida abierta de más de 5 cm",
  "trasp": true,
  "formula": "% = gansos con heridas graves o profundas / gansos evaluados × 100, más evidencia de tratamiento.",
  "escala": [
   [
    100,
    "Ningún ganso presenta heridas o lesiones graves o profundas."
   ],
   [
    55,
    "Del 1 % al 15 % las presenta y hay evidencia de tratamiento."
   ],
   [
    20,
    "Del 16 % al 20 % las presenta y no hay evidencia de tratamiento."
   ],
   [
    0,
    "Más del 20 % las presenta y no han sido tratadas."
   ]
  ],
  "crit": "Salud e integridad física",
  "m": {
   "kind": "pct",
   "total": "Gansos evaluados",
   "part": "Gansos con heridas graves (más de 5 cm)",
   "rule": "GA01",
   "extra": "Hay evidencia de tratamiento"
  },
  "app": {}
 },
 {
  "code": "GA02",
  "sp": "ganso",
  "g": "MBA",
  "num": "7.2.2",
  "tabla": "48",
  "name": "Apariencia del plumaje",
  "q": "¿Cuál es el estado general del plumaje de los gansos?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Ganso de la muestra",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Escasez de plumaje, plumaje sucio o erizado; no cuenta la suciedad de la cloaca",
  "trasp": true,
  "formula": "% = gansos con plumaje adecuado / gansos evaluados × 100.",
  "escala": [
   [
    100,
    "Todos los gansos con plumaje adecuado."
   ],
   [
    55,
    "Al menos el 60 % con plumaje adecuado."
   ],
   [
    0,
    "Más del 40 % con plumaje inadecuado."
   ]
  ],
  "crit": "Salud e integridad física",
  "m": {
   "kind": "pct",
   "total": "Gansos evaluados",
   "part": "Gansos con plumaje adecuado",
   "rule": "GA02",
   "extra": null
  },
  "app": {}
 },
 {
  "code": "GA03",
  "sp": "ganso",
  "g": "MBA",
  "num": "7.2.3",
  "tabla": "49",
  "name": "Podo dermatitis plantar",
  "q": "¿Los gansos evaluados presentan podo dermatitis en sus patas?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Ganso de la muestra (sostenido en posición ventrodorsal)",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Siempre",
  "trasp": true,
  "formula": "% = gansos con podo dermatitis / gansos evaluados × 100, más evidencia de tratamiento.",
  "escala": [
   [
    100,
    "Ningún ganso presenta podo dermatitis."
   ],
   [
    55,
    "Menos del 20 % y hay evidencia de tratamiento."
   ],
   [
    20,
    "Más del 20 % y hay evidencia de tratamiento."
   ],
   [
    0,
    "Más del 20 % y no ha sido tratada."
   ]
  ],
  "crit": "Salud e integridad física",
  "m": {
   "kind": "pct",
   "total": "Gansos evaluados",
   "part": "Gansos con podo dermatitis",
   "rule": "GA03",
   "extra": "Hay evidencia de tratamiento"
  },
  "app": {}
 },
 {
  "code": "GA04",
  "sp": "ganso",
  "g": "MBA",
  "num": "7.2.4",
  "tabla": "50",
  "name": "Presencia de diarrea",
  "q": "¿Los gansos evaluados presentan diarrea?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Ganso de la muestra",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Tratamiento verificable con documento, foto o video reciente",
  "trasp": true,
  "formula": "% = gansos con diarrea / gansos evaluados × 100, más evidencia de tratamiento.",
  "escala": [
   [
    100,
    "No hay evidencia de diarrea."
   ],
   [
    55,
    "Entre el 1 % y el 10 % y hay evidencia de tratamiento."
   ],
   [
    20,
    "Más del 10 % y hay evidencia de tratamiento."
   ],
   [
    0,
    "Más del 10 % y no hay evidencia de tratamiento."
   ]
  ],
  "crit": "Salud e integridad física",
  "m": {
   "kind": "pct",
   "total": "Gansos evaluados",
   "part": "Gansos con diarrea",
   "rule": "GA04",
   "extra": "Hay evidencia de tratamiento"
  },
  "app": {}
 },
 {
  "code": "GA05",
  "sp": "ganso",
  "g": "MBA",
  "num": "7.2.5",
  "tabla": "51",
  "name": "Condición del pico",
  "q": "¿Cuál es el nivel de daño asociado a la condición del pico?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Ganso de la muestra",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Siempre",
  "trasp": true,
  "formula": "% = gansos con lesiones en el pico ÷ gansos evaluados × 100. Sin lesiones = 100; 1–6 % con funcionalidad completa = 55; 1–8 % sin funcionalidad completa = 20; más del 8 % sin funcionalidad = 0.",
  "escala": [
   [
    100,
    "Sin lesiones y con funcionalidad completa en todos."
   ],
   [
    55,
    "Entre el 1 % y el 6 % con lesiones, con funcionalidad completa."
   ],
   [
    20,
    "Entre el 6 % y el 8 % con lesiones y sin funcionalidad completa."
   ],
   [
    0,
    "Más del 8 % con lesiones y sin funcionalidad."
   ]
  ],
  "crit": "Salud e integridad física",
  "m": {
   "kind": "pct",
   "total": "Gansos evaluados",
   "part": "Gansos con lesiones en el pico",
   "rule": "GA05",
   "extra": "Los gansos con lesión conservan la funcionalidad completa del pico"
  },
  "app": {}
 },
 {
  "code": "GA06",
  "sp": "ganso",
  "g": "MBA",
  "num": "7.2.6",
  "tabla": "52",
  "name": "Animales cojos",
  "q": "¿Qué porcentaje de gansos presenta cojeras?",
  "metodo": "Inspección visual de una proporción de gansos",
  "unidad": "Gansos evaluados (muestra)",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "No se cuentan las aves con dudas sobre su condición",
  "trasp": true,
  "formula": "% = gansos cojos / gansos observados × 100.",
  "escala": [
   [
    100,
    "Menos del 3 %."
   ],
   [
    55,
    "Entre el 4 % y el 6 %."
   ],
   [
    20,
    "Entre el 6 % y el 8 %."
   ],
   [
    0,
    "Más del 8 %."
   ]
  ],
  "crit": "Salud e integridad física",
  "m": {
   "kind": "pct",
   "total": "Gansos evaluados",
   "part": "Gansos cojos (sin dudas)",
   "rule": "GA06",
   "extra": null
  },
  "app": {}
 },
 {
  "code": "GA07",
  "sp": "ganso",
  "g": "MBA",
  "num": "7.2.7",
  "tabla": "53",
  "name": "Presencia de secreciones oculares y/o conjuntivitis",
  "q": "¿Los gansos presentan secreciones oculares o conjuntivitis? ¿Están siendo tratadas?",
  "metodo": "Inspección visual de una proporción de gansos",
  "unidad": "Gansos evaluados (muestra)",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Tratamiento verificable con documento, foto o video reciente",
  "trasp": true,
  "formula": "% = gansos afectados / gansos evaluados × 100, más evidencia de tratamiento.",
  "escala": [
   [
    100,
    "Sin evidencia."
   ],
   [
    55,
    "Entre el 1 % y el 10 % y hay evidencia de tratamiento."
   ],
   [
    20,
    "Más del 10 % y hay evidencia de tratamiento."
   ],
   [
    0,
    "Más del 10 % y no hay evidencia de tratamiento."
   ]
  ],
  "crit": "Salud e integridad física",
  "m": {
   "kind": "pct",
   "total": "Gansos evaluados",
   "part": "Gansos con secreciones o conjuntivitis",
   "rule": "GA04",
   "extra": "Hay evidencia de tratamiento"
  },
  "app": {}
 },
 {
  "code": "GA08",
  "sp": "ganso",
  "g": "MBA",
  "num": "7.2.8",
  "tabla": "54",
  "name": "Agresiones intraespecíficas",
  "q": "¿Se presentan agresiones intraespecíficas?",
  "metodo": "Inspección visual de una proporción de gansos",
  "unidad": "Gansos observados en el recorrido",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "En una pelea mutua se cuentan los dos individuos",
  "trasp": true,
  "formula": "% = gansos con comportamiento agresivo / gansos observados × 100.",
  "escala": [
   [
    100,
    "Menos del 5 %."
   ],
   [
    55,
    "Entre el 6 % y el 8 %."
   ],
   [
    20,
    "Entre el 8 % y el 10 %."
   ],
   [
    0,
    "Más del 10 %."
   ]
  ],
  "crit": "Comportamiento",
  "m": {
   "kind": "pct",
   "total": "Gansos observados",
   "part": "Gansos con comportamiento agresivo",
   "rule": "GA08",
   "extra": null
  },
  "app": {}
 },
 {
  "code": "GA09",
  "sp": "ganso",
  "g": "MBA",
  "num": "7.2.9",
  "tabla": "55",
  "name": "Interacción negativa con el humano",
  "q": "¿Qué porcentaje de los animales presenta conductas agresivas hacia el humano?",
  "metodo": "Inspección visual con muestreo",
  "unidad": "Gansos observados en el recorrido",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Solo interacciones intencionadas; se excluyen huida y picoteo exploratorio",
  "trasp": true,
  "formula": "% = gansos agresivos con el evaluador / gansos observados × 100.",
  "escala": [
   [
    100,
    "Menos del 3 %."
   ],
   [
    55,
    "Entre el 4 % y el 6 %."
   ],
   [
    20,
    "Entre el 6 % y el 8 %."
   ],
   [
    0,
    "Más del 8 %."
   ]
  ],
  "crit": "Comportamiento",
  "m": {
   "kind": "pct",
   "total": "Gansos observados",
   "part": "Gansos agresivos con el evaluador",
   "rule": "GA06",
   "extra": null
  },
  "app": {}
 },
 {
  "code": "GA10",
  "sp": "ganso",
  "g": "MBA",
  "num": "7.2.10",
  "tabla": "56",
  "name": "Valoración de comportamientos positivos",
  "q": "¿Los gansos evaluados manifiestan comportamientos positivos?",
  "metodo": "Inspección visual de una proporción de gansos",
  "unidad": "Gansos evaluados durante al menos 5 minutos",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Acicalamiento, nado, juego, apareo, conductas afiliativas y tranquilas",
  "trasp": true,
  "formula": "% = gansos con comportamientos positivos / gansos observados × 100.",
  "escala": [
   [
    100,
    "Entre el 70 % y el 100 %."
   ],
   [
    55,
    "Entre el 50 % y el 69 %."
   ],
   [
    0,
    "Menos del 50 % no manifiesta comportamientos positivos."
   ]
  ],
  "crit": "Comportamiento",
  "m": {
   "kind": "pct",
   "total": "Gansos evaluados (mínimo 5 minutos)",
   "part": "Gansos con conductas positivas",
   "rule": "GA10",
   "extra": null
  },
  "app": {}
 },
 {
  "code": "GG01",
  "sp": "ganso",
  "g": "MBG",
  "num": "7.3.1",
  "tabla": "57",
  "name": "Plan de contingencia para desastres naturales",
  "q": "¿Existe un plan de contingencia para desastres naturales o escasez de alimento y agua, escrito e implementado?",
  "metodo": "Entrevista y revisión documental",
  "unidad": "Plan escrito y personal del predio",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Siempre",
  "trasp": false,
  "formula": "Nivel según existencia, implementación y conocimiento.",
  "escala": [
   [
    100,
    "Tiene plan de contingencia escrito e implementado."
   ],
   [
    55,
    "Hay plan escrito, pero no implementado."
   ],
   [
    20,
    "No existe plan escrito, pero se evidencia el conocimiento."
   ],
   [
    0,
    "No existe plan de contingencia."
   ]
  ],
  "crit": "Contingencias",
  "m": {
   "kind": "radio",
   "opts": [
    [
     "Escrito e implementado",
     100
    ],
    [
     "Escrito, sin implementar",
     55
    ],
    [
     "Sin plan escrito, pero el personal lo conoce",
     20
    ],
    [
     "No existe",
     0
    ]
   ]
  },
  "app": {}
 },
 {
  "code": "GG02",
  "sp": "ganso",
  "g": "MBG",
  "num": "7.3.2",
  "tabla": "58",
  "name": "Plan sanitario (prevención y diagnóstico)",
  "q": "¿El predio dispone de un plan sanitario documentado?",
  "metodo": "Inspección documental",
  "unidad": "Plan sanitario firmado",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Siempre",
  "trasp": false,
  "formula": "Cumple / no cumple.",
  "escala": [
   [
    100,
    "Se evidencia el plan sanitario firmado por MV o MVZ y está implementado."
   ],
   [
    0,
    "No existe evidencia del plan sanitario."
   ]
  ],
  "crit": "Sanidad",
  "m": {
   "kind": "doc",
   "prof": true
  },
  "app": {}
 },
 {
  "code": "GG03",
  "sp": "ganso",
  "g": "MBG",
  "num": "7.3.3",
  "tabla": "59",
  "name": "Plan de sacrificio humanitario (sistema de registro)",
  "q": "¿Dispone de procedimiento y registro para el sacrificio humanitario? ¿Se sigue a la OMSA?",
  "metodo": "Inspección documental",
  "unidad": "Procedimiento y registros de sacrificios",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Siempre",
  "trasp": false,
  "formula": "Cumple / no cumple.",
  "escala": [
   [
    100,
    "Existe procedimiento escrito o sistema de registro de los sacrificios; o no se han sacrificado gansos en el último año."
   ],
   [
    0,
    "No existe procedimiento escrito ni sistema de registro."
   ]
  ],
  "crit": "Sacrificio humanitario",
  "m": {
   "kind": "radio",
   "opts": [
    [
     "Hay procedimiento escrito o registro de sacrificios",
     100
    ],
    [
     "No se sacrificaron gansos en el último año",
     100
    ],
    [
     "No hay procedimiento ni registro",
     0
    ]
   ]
  },
  "app": {}
 },
 {
  "code": "GG04",
  "sp": "ganso",
  "g": "MBG",
  "num": "7.3.4",
  "tabla": "60",
  "name": "Identificación de animales",
  "q": "¿La identificación se hace con métodos que no causen daño en los tejidos ni mutilación?",
  "metodo": "Inspección visual y documental",
  "unidad": "Gansos de la muestra y registros",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Siempre",
  "trasp": false,
  "formula": "Cumple / no cumple.",
  "escala": [
   [
    100,
    "Identificación con brazaletes, nombres o microchips; o no se identifican los gansos."
   ],
   [
    0,
    "Identificación con tatuajes, hierro caliente o muescas, con daño en los tejidos o mutilación."
   ]
  ],
  "crit": "Identificación",
  "m": {
   "kind": "radio",
   "opts": [
    [
     "Brazalete",
     100
    ],
    [
     "Nombre",
     100
    ],
    [
     "Microchip",
     100
    ],
    [
     "No se identifican",
     100
    ],
    [
     "Tatuaje, hierro caliente o muescas",
     0
    ]
   ]
  },
  "app": {}
 },
 {
  "code": "GG05",
  "sp": "ganso",
  "g": "MBG",
  "num": "7.3.5",
  "tabla": "61",
  "name": "Capacitación del personal en bienestar animal",
  "q": "¿El personal está capacitado y certificado en bienestar animal de gansos? ¿Muestra conocimientos al ser entrevistado?",
  "metodo": "Entrevista e inspección documental",
  "unidad": "Personal encargado del manejo",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Siempre",
  "trasp": false,
  "formula": "% = personal certificado / personal encargado × 100, más conocimiento demostrado.",
  "escala": [
   [
    100,
    "Más del 80 % certifica su capacitación."
   ],
   [
    55,
    "Entre el 50 % y el 79 % certifica su capacitación y demuestra conocimiento."
   ],
   [
    20,
    "Entre el 20 % y el 49 % no certifica su capacitación, pero demuestra conocimiento."
   ],
   [
    0,
    "Menos del 20 % no certifica su capacitación y no demuestra conocimiento."
   ]
  ],
  "crit": "Capacitación",
  "m": {
   "kind": "pct",
   "total": "Personal que maneja gansos",
   "part": "Personal con certificado",
   "rule": "GG05",
   "extra": "Demuestra conocimiento en la entrevista"
  },
  "app": {}
 },
 {
  "code": "GG06",
  "sp": "ganso",
  "g": "MBG",
  "num": "7.3.6",
  "tabla": "62",
  "name": "Uso responsable de medicamentos e insumos veterinarios",
  "q": "¿Se cumplen las buenas prácticas en el uso de medicamentos veterinarios?",
  "metodo": "Inspección documental y visual del almacenamiento",
  "unidad": "Registros y bodega de medicamentos",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Siempre",
  "trasp": false,
  "formula": "Cumple / no cumple todas las BPUMV.",
  "escala": [
   [
    100,
    "Se cumplen todas las buenas prácticas del uso de medicamentos veterinarios."
   ],
   [
    0,
    "No se cumplen todas las buenas prácticas."
   ]
  ],
  "crit": "Medicamentos",
  "m": {
   "kind": "bpumv",
   "mode": "ganso"
  },
  "app": {}
 },
 {
  "code": "GG07",
  "sp": "ganso",
  "g": "MBG",
  "num": "7.3.7",
  "tabla": "63",
  "name": "Mortalidad",
  "q": "¿Cuál es la tasa de mortalidad de los gansos en el predio?",
  "metodo": "Inspección documental",
  "unidad": "Registro de mortalidad de los últimos 2 años",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Incluye gansos sometidos a eutanasia; excluye lotes con situaciones extraordinarias",
  "trasp": false,
  "formula": "% mortalidad acumulada = gansos muertos / gansos del período × 100 (últimos 2 años).",
  "escala": [
   [
    100,
    "Mortalidad menor o igual al 3 % y se llevan registros escritos."
   ],
   [
    55,
    "Mortalidad menor o igual al 3 % y no se llevan registros escritos."
   ],
   [
    20,
    "Mortalidad entre el 3 % y el 5 %."
   ],
   [
    0,
    "Mortalidad superior al 5 % o no proporciona información."
   ]
  ],
  "crit": "Mortalidad",
  "m": {
   "kind": "pct",
   "total": "Gansos del período (2 años)",
   "part": "Gansos muertos (incluye eutanasia)",
   "rule": "GG07",
   "extra": "Lleva registros escritos"
  },
  "app": {}
 },
 {
  "code": "GG08",
  "sp": "ganso",
  "g": "MBG",
  "num": "7.3.8",
  "tabla": "64",
  "name": "Protocolo de sacrificio humanitario",
  "q": "¿El predio dispone de un procedimiento y sistema de registro para el sacrificio humanitario?",
  "metodo": "Inspección documental",
  "unidad": "Protocolo y registros",
  "prod": "Cría, carne, huevo, plumas, hígado graso",
  "cond": "Solo sistemas intensivo y semi-intensivo",
  "trasp": false,
  "formula": "Cumple / no cumple.",
  "escala": [
   [
    100,
    "Protocolo con método, procedimiento y criterios; elaborado y firmado por MV o MVZ con matrícula vigente; acorde con el título 7 del Código de la OMSA."
   ],
   [
    0,
    "No existe, no está firmado por MV o MVZ con matrícula vigente o no es acorde con la OMSA."
   ]
  ],
  "crit": "Sacrificio humanitario",
  "m": {
   "kind": "doc",
   "prof": true
  },
  "app": {
   "sistema": [
    "Intensivo",
    "Semi-intensivo"
   ]
  }
 }
];
