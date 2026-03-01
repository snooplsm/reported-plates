export function refinePlateForTLC(plateText: string): [string, boolean] {
  let tlc = false
  if (plateText?.startsWith('T') && plateText.endsWith('C') && plateText.length === 7) {
    plateText = plateText.replace(/I/g, '1');
    plateText = plateText.replace(/L/g, '1');
    plateText = plateText.replace(/Z/g, '2');
    plateText = plateText.replace(/G/g, '6');
    plateText = plateText.replace(/B/g, '8');
    plateText = plateText.replace(/A/g, '4');
    plateText = plateText.replace(/O/g, '0');
    tlc = true
  }
  return [plateText, tlc]
}
