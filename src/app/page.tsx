import { WeatherChat } from '@/components/chat/weather-chat';

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <WeatherChat />
    </div>
  );
}
