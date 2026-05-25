export type TodayWeather = {
  cityLabel: string;
  temperatureC: number;
  humidityPercent: number;
  weatherCode: number;
  conditionLabel: string;
  windSpeedKmh: number;
};

const DEFAULT_COORDS = {
  cityLabel: '서울',
  latitude: 37.5665,
  longitude: 126.978,
};

function weatherCodeLabel(code: number) {
  if (code === 0) {
    return '맑음';
  }

  if (code === 1 || code === 2) {
    return '대체로 맑음';
  }

  if (code === 3) {
    return '흐림';
  }

  if (code === 45 || code === 48) {
    return '안개';
  }

  if (code >= 51 && code <= 57) {
    return '이슬비';
  }

  if (code >= 61 && code <= 67) {
    return '비';
  }

  if (code >= 71 && code <= 77) {
    return '눈';
  }

  if (code >= 80 && code <= 82) {
    return '소나기';
  }

  if (code >= 95) {
    return '뇌우';
  }

  return '변덕스러운 날씨';
}

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
};

/** Open-Meteo 무료 API — 키 없이 당일 기온·습도 조회 */
export async function fetchTodayWeather(
  coords: { latitude: number; longitude: number; cityLabel: string } = DEFAULT_COORDS,
): Promise<TodayWeather> {
  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
    timezone: 'Asia/Seoul',
    forecast_days: '1',
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

  if (!response.ok) {
    throw new Error('날씨 정보를 가져오지 못했습니다.');
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const current = data.current;

  if (
    typeof current?.temperature_2m !== 'number' ||
    typeof current.relative_humidity_2m !== 'number'
  ) {
    throw new Error('날씨 데이터 형식이 올바르지 않습니다.');
  }

  const weatherCode = current.weather_code ?? 3;

  return {
    cityLabel: coords.cityLabel,
    temperatureC: Math.round(current.temperature_2m),
    humidityPercent: Math.round(current.relative_humidity_2m),
    weatherCode,
    conditionLabel: weatherCodeLabel(weatherCode),
    windSpeedKmh: Math.round(current.wind_speed_10m ?? 0),
  };
}
