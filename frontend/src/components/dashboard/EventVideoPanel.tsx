import { Video } from "lucide-react";

export default function EventVideoPanel({ clipUrl }: { clipUrl: string | null }) {
  return (
    <div className="flex-1 bg-gray-900 flex items-center justify-center min-w-0">
      {clipUrl ? (
        <video src={clipUrl} controls className="w-full h-full object-contain" />
      ) : (
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <Video className="w-10 h-10" />
          <span className="text-sm">영상 클립 없음</span>
        </div>
      )}
    </div>
  );
}
