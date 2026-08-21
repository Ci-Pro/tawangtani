export interface GridInput {
  lengthM: number;
  widthM: number;
  plotCount?: number;
}

export interface GridResult {
  areaM2: number;
  areaAre: number;
  areaHa: number;
  plotCount?: number;
  perPlotM2?: number;
  formula: string;
}

function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} harus berupa angka lebih dari 0`);
  }
}

export function calcGrid(input: GridInput): GridResult {
  assertPositive(input.lengthM, 'Panjang');
  assertPositive(input.widthM, 'Lebar');
  const areaM2 = input.lengthM * input.widthM;
  const parts = [
    `Luas = panjang × lebar`,
    `Luas = ${input.lengthM} m × ${input.widthM} m = ${areaM2.toFixed(1)} m²`,
    `= ${(areaM2 / 100).toFixed(2)} are = ${(areaM2 / 10000).toFixed(4)} ha`,
  ];

  let perPlotM2: number | undefined;
  if (input.plotCount && input.plotCount > 1) {
    const plots = Math.floor(input.plotCount);
    perPlotM2 = areaM2 / plots;
    parts.push(`Per petak = ${areaM2.toFixed(1)} m² ÷ ${plots} = ${perPlotM2.toFixed(1)} m²`);
    return {
      areaM2,
      areaAre: areaM2 / 100,
      areaHa: areaM2 / 10000,
      plotCount: plots,
      perPlotM2,
      formula: parts.join('\n'),
    };
  }

  return { areaM2, areaAre: areaM2 / 100, areaHa: areaM2 / 10000, formula: parts.join('\n') };
}
