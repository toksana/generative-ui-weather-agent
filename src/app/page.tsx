import { WeatherChat } from '@/components/chat/weather-chat';

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-gradient-to-br from-sky-50 via-white to-blue-50 sm:items-center sm:justify-center dark:from-slate-950 dark:via-background dark:to-blue-950">
      <WeatherChat />
    </div>
  );
}
