import React from 'react';

interface Props {
  garanzieSelezionate: Set<string>;
  regime: string;
}

function calcolaPercAgea(garanzie: Set<string>, regime: string): number {
  if (regime !== 'agevolato') return 0;
  const hasGR = garanzie.has('grandine');
  const hasVF = garanzie.has('vento_forte');
  const hasEP = garanzie.has('eccesso_pioggia');
  const catastrofali = [
    'gelo_brina', 'siccita', 'alluvione',
    'eccesso_neve', 'colpo_sole_vento_caldo', 'sbalzo_termico',
  ];
  const hasCat = catastrofali.some((g) => garanzie.has(g));

  if (hasGR && hasVF && hasEP && hasCat) return 70;
  if (hasGR && hasVF && hasEP) return 62;
  if (hasGR && hasVF) return 48;
  return 0;
}

function descrizioneAgea(perc: number): string {
  if (perc >= 70) return 'Pacchetto Frequenziale completo + almeno 1 garanzia Catastrofale';
  if (perc >= 62) return 'Pacchetto Frequenziale completo (Grandine + Vento Forte + Eccesso di Pioggia)';
  if (perc >= 48) return 'Grandine + Vento Forte';
  return 'Nessun contributo AGEA applicabile';
}

export default function AgeaBanner({ garanzieSelezionate, regime }: Props) {
  const perc = calcolaPercAgea(garanzieSelezionate, regime);

  const bgColor = perc >= 70
    ? 'bg-green-50 border-green-400'
    : perc >= 48
      ? 'bg-blue-50 border-blue-400'
      : 'bg-gray-50 border-gray-300';

  const textColor = perc >= 70
    ? 'text-green-800'
    : perc >= 48
      ? 'text-blue-800'
      : 'text-gray-600';

  const iconColor = perc >= 70
    ? 'text-green-500'
    : perc >= 48
      ? 'text-blue-500'
      : 'text-gray-400';

  return (
    <div className={`rounded-lg border-2 p-4 ${bgColor} transition-all duration-300`}>
      <div className="flex items-start gap-3">
        <span className={`text-2xl font-bold ${iconColor}`}>
          {perc >= 70 ? 'A' : perc >= 48 ? 'i' : '!'}
        </span>
        <div>
          <h4 className={`font-bold text-lg ${textColor}`}>
            Contributo AGEA applicato: {perc}% sulla parte agevolata
          </h4>
          <p className={`text-sm mt-1 ${textColor} opacity-80`}>
            {descrizioneAgea(perc)}
          </p>
          {regime !== 'agevolato' && (
            <p className="text-sm mt-2 text-amber-700 font-medium">
              In regime Non Agevolato il contributo AGEA e sempre 0%.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
