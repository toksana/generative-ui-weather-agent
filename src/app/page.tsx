import { WeatherChat } from '@/components/chat/weather-chat';

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background sm:items-center sm:justify-center">
      <WeatherChat />
    </div>
  );
}
