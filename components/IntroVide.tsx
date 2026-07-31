"use client";

export default function YouTubeCustomPlayer() {
  const id = "CjNRgEMrlrg";

  return (
    <div className="w-full max-w-3xl mx-auto aspect-video rounded-xl overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&controls=1&fs=0&playlist=${id}&loop=1`}
        title="YouTube video"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}
