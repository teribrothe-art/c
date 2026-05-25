import { runAiCompletion } from './ai-completion';
import { isAiAppUtilizationEnabled } from './ai-edge';
import { fetchTodayWeather, type TodayWeather } from './weather-service';
import { sanitizeTreatmentsForCustomer } from './treatment-privacy';
import type { Treatment } from './treatments';

export type WeatherHairRiskLevel = 'low' | 'medium' | 'high';

export type WeatherHairCareAdvice = {
  headline: string;
  message: string;
  riskLevel: WeatherHairRiskLevel;
  weather: TodayWeather;
};

function inferRiskLevel(weather: TodayWeather, latestDamage: number | null): WeatherHairRiskLevel {
  let score = 0;

  if (weather.temperatureC >= 30) {
    score += 2;
  } else if (weather.temperatureC <= 5) {
    score += 2;
  }

  if (weather.humidityPercent >= 75) {
    score += 2;
  } else if (weather.humidityPercent <= 30) {
    score += 1;
  }

  if (weather.weatherCode >= 51) {
    score += 1;
  }

  if (typeof latestDamage === 'number' && latestDamage >= 7) {
    score += 2;
  } else if (typeof latestDamage === 'number' && latestDamage >= 5) {
    score += 1;
  }

  if (score >= 4) {
    return 'high';
  }

  if (score >= 2) {
    return 'medium';
  }

  return 'low';
}

function buildRuleBasedWeatherAdvice(
  weather: TodayWeather,
  latest: Treatment | null,
): Pick<WeatherHairCareAdvice, 'headline' | 'message' | 'riskLevel'> {
  const riskLevel = inferRiskLevel(weather, latest?.damage_level ?? null);
  const damageHint =
    typeof latest?.damage_level === 'number'
      ? `최근 손상도 ${latest.damage_level}/10을 고려하면 `
      : '';

  const tips: string[] = [];

  if (weather.temperatureC >= 28) {
    tips.push('자외선·열로 모발이 건조해지기 쉬워요. UV 차단 스프레이와 낮은 온도 드라이를 권장해요.');
  }

  if (weather.temperatureC <= 8) {
    tips.push('찬 공기에 정전기·건조가 올 수 있어요. 보습 오일과 실크 수건 드라이를 추천해요.');
  }

  if (weather.humidityPercent >= 70) {
    tips.push('습도가 높아 뿌리가 처지거나 부스스해질 수 있어요. 가벼운 스타일링 제품으로 결을 정돈하세요.');
  }

  if (weather.humidityPercent <= 35) {
    tips.push('건조한 공기로 끝머리가 거칠어질 수 있어요. 오늘은 린스·헤어 미스트로 수분을 보충하세요.');
  }

  if (weather.weatherCode >= 61 && weather.weatherCode <= 82) {
    tips.push('비 오는 날 습기가 모발 표면에 닿으면 컬러·펌 유지력이 떨어질 수 있어요.');
  }

  if (tips.length === 0) {
    tips.push('오늘 날씨는 비교적 안정적이에요. 평소 홈케어 루틴을 유지하면 좋아요.');
  }

  const headline =
    riskLevel === 'high'
      ? '오늘 날씨, 모발에 주의가 필요해요'
      : riskLevel === 'medium'
        ? '오늘 날씨가 모발에 영향을 줄 수 있어요'
        : '오늘 날씨는 모발에 비교적 안정적이에요';

  return {
    headline,
    message: `${damageHint}${weather.cityLabel} ${weather.conditionLabel} · ${weather.temperatureC}°C · 습도 ${weather.humidityPercent}%. ${tips[0]}`,
    riskLevel,
  };
}

function buildWeatherContext(weather: TodayWeather, treatments: Treatment[]) {
  const sorted = [...treatments]
    .sort((a, b) => b.treatment_date.localeCompare(a.treatment_date))
    .slice(0, 3);

  return {
    weather: {
      city: weather.cityLabel,
      condition: weather.conditionLabel,
      temperature_c: weather.temperatureC,
      humidity_percent: weather.humidityPercent,
      wind_speed_kmh: weather.windSpeedKmh,
    },
    recent_treatments: sanitizeTreatmentsForCustomer(sorted).map((item) => ({
      type: item.treatment_type,
      title: item.treatment_title,
      damage_level: item.damage_level ?? null,
      home_care: item.home_care ?? null,
    })),
  };
}

export async function getWeatherHairCareAdvice(
  treatments: Treatment[],
): Promise<WeatherHairCareAdvice> {
  const weather = await fetchTodayWeather();
  const latest =
    [...treatments].sort((a, b) => b.treatment_date.localeCompare(a.treatment_date))[0] ?? null;
  const baseline = buildRuleBasedWeatherAdvice(weather, latest);

  if (!isAiAppUtilizationEnabled()) {
    return { ...baseline, weather };
  }

  try {
    const { text } = await runAiCompletion({
      task: 'weather_hair_care',
      userMessage:
        '오늘 날씨·기온·습도가 고객 모발에 미칠 수 있는 영향을 미리 짚고, 예방 조언 2~3문장을 작성해주세요.',
      context: buildWeatherContext(weather, treatments),
    });

    const trimmed = text.trim();

    if (trimmed) {
      return {
        headline: baseline.headline,
        message: trimmed,
        riskLevel: baseline.riskLevel,
        weather,
      };
    }
  } catch {
    // 규칙 기반 유지
  }

  return { ...baseline, weather };
}
