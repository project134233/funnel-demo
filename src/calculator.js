const DEFAULT_CARS = {
  model3: { nome: "Tesla Model 3", batteria: "55-75 kWh", consumo: 15.0 },
  id3born: { nome: "Volkswagen ID.3 / Cupra Born", batteria: "~62 kWh", consumo: 14.0 },
  ev5: { nome: "Kia EV5 (varianti)", batteria: "60-88 kWh", consumo: 16.0 },
  i4: { nome: "BMW i4", batteria: "83-84 kWh", consumo: 19.0 },
  bolt: { nome: "Chevrolet Bolt / Opel Ampera-e", batteria: "~60 kWh", consumo: 15.5 },
  smart3: { nome: "Smart #3", batteria: "49-66 kWh", consumo: 17.0 },
  togg: { nome: "Togg T10X", batteria: "52-88 kWh", consumo: 16.5 }
};

const DEFAULT_PLANT_OUTPUT = {
  "4": 4000,
  "5": 5000,
  "6": 6000
};

const DEFAULT_PACKAGES = {
  huawei: 10500,
  aiko: 10500,
  sunpower: 14500
};

function toPositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function eur(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);
}

function pickCatalogOverrides(catalog = {}) {
  return {
    cars: catalog.cars && typeof catalog.cars === "object" ? catalog.cars : DEFAULT_CARS,
    plantOutput: catalog.plantOutput && typeof catalog.plantOutput === "object" ? catalog.plantOutput : DEFAULT_PLANT_OUTPUT,
    packages: catalog.packagePrices && typeof catalog.packagePrices === "object" ? catalog.packagePrices : DEFAULT_PACKAGES
  };
}

function calculateEV(inputs, catalog) {
  const { cars, plantOutput } = pickCatalogOverrides(catalog);

  const autoKey = String(inputs.autoKey || "");
  const auto = cars[autoKey];
  if (!auto) {
    throw new Error("Modello auto non valido.");
  }

  const kmAnnui = toPositiveNumber(inputs.kmAnnui);
  if (!kmAnnui) {
    throw new Error("Inserisci km annui validi.");
  }

  const prezzoPubblico = toPositiveNumber(inputs.prezzoPubblico);
  if (!prezzoPubblico) {
    throw new Error("Inserisci un prezzo pubblico/rete valido (EUR/kWh).");
  }

  const quotaEVdaFV = toNumber(inputs.quotaEVdaFV);
  if (quotaEVdaFV === null || quotaEVdaFV < 0 || quotaEVdaFV > 100) {
    throw new Error("Inserisci una quota FV valida (0-100).");
  }

  const prezzoReteCasa = toPositiveNumber(inputs.prezzoReteCasa);
  if (!prezzoReteCasa) {
    throw new Error("Inserisci un costo energia domestica valido (EUR/kWh).");
  }

  const consumoCustom = toPositiveNumber(inputs.consumoCustom);
  const consumo = consumoCustom || auto.consumo;

  const impianto = String(inputs.impianto || "");
  const produzioneImpianto = toNumber(plantOutput[impianto]);
  if (!produzioneImpianto) {
    throw new Error("Impianto fotovoltaico non valido.");
  }

  const kWhEVannui = (kmAnnui * consumo) / 100;
  const kWhDaFV = kWhEVannui * (quotaEVdaFV / 100);
  const kWhDaRete = Math.max(0, kWhEVannui - kWhDaFV);

  const costoSenzaFV = kWhEVannui * prezzoPubblico;
  const costoConFV_vsPubblico = kWhDaRete * prezzoPubblico;
  const risparmioVsPubblico = costoSenzaFV - costoConFV_vsPubblico;

  const costoCasaSenzaFV = kWhEVannui * prezzoReteCasa;
  const costoCasaConFV = kWhDaRete * prezzoReteCasa;
  const risparmioVsCasa = costoCasaSenzaFV - costoCasaConFV;

  const costoPerKm_pubblico = (consumo / 100) * prezzoPubblico;
  const costoPerKm_casa = (consumo / 100) * prezzoReteCasa;

  const fvSufficiente = produzioneImpianto >= kWhDaFV;

  return {
    inputs: {
      autoKey,
      impianto,
      kmAnnui,
      consumo,
      prezzoPubblico,
      prezzoReteCasa,
      quotaEVdaFV
    },
    auto,
    energy: {
      kWhEVannui,
      kWhDaFV,
      kWhDaRete,
      produzioneImpianto,
      fvSufficiente
    },
    costs: {
      costoSenzaFV,
      costoConFV_vsPubblico,
      costoCasaSenzaFV,
      costoCasaConFV,
      costoPerKm_pubblico,
      costoPerKm_casa
    },
    savings: {
      risparmioVsPubblico,
      risparmioVsCasa
    }
  };
}

function calculatePayback(calculation, packageKey, catalog) {
  const { packages } = pickCatalogOverrides(catalog);

  const key = String(packageKey || "");
  const costoImpianto = toPositiveNumber(packages[key]);

  if (!costoImpianto) {
    throw new Error("Pacchetto non valido.");
  }

  const risparmioAnnualeStimato = calculation.savings.risparmioVsPubblico;
  if (!risparmioAnnualeStimato || risparmioAnnualeStimato <= 0) {
    throw new Error("Risparmio annuo nullo: impossibile stimare il rientro.");
  }

  const anniRientro = costoImpianto / risparmioAnnualeStimato;
  const anniRientroConDetrazione = (costoImpianto * 0.5) / risparmioAnnualeStimato;

  return {
    packageKey: key,
    costoImpianto,
    risparmioAnnualeStimato,
    anniRientro,
    anniRientroConDetrazione
  };
}

function summarizeCalculation(calculation, payback) {
  const lines = [
    `Auto: ${calculation.auto.nome} (${calculation.inputs.consumo.toFixed(1)} kWh/100km)`,
    `Energia EV annua: ${Math.round(calculation.energy.kWhEVannui)} kWh`,
    `Copertura FV: ${calculation.inputs.quotaEVdaFV.toFixed(0)}% (${Math.round(calculation.energy.kWhDaFV)} kWh)`,
    `Residuo da rete/pubblico: ${Math.round(calculation.energy.kWhDaRete)} kWh`,
    `Risparmio vs pubblico: ${eur(calculation.savings.risparmioVsPubblico)}/anno`,
    `Risparmio vs casa: ${eur(calculation.savings.risparmioVsCasa)}/anno`
  ];

  if (!calculation.energy.fvSufficiente) {
    lines.push("Attenzione: la quota FV impostata supera la produzione annua indicata.");
  }

  if (payback) {
    lines.push(`Rientro pacchetto ${payback.packageKey.toUpperCase()}: ${payback.anniRientro.toFixed(1)} anni`);
    lines.push(`Rientro con detrazione 50%: ${payback.anniRientroConDetrazione.toFixed(1)} anni`);
  }

  return lines.join("\n");
}

module.exports = {
  DEFAULT_CARS,
  DEFAULT_PLANT_OUTPUT,
  DEFAULT_PACKAGES,
  calculateEV,
  calculatePayback,
  summarizeCalculation
};
