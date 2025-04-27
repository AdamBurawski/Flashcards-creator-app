import { Card, CardContent } from "./ui/card";

const SkeletonLoader = () => {
  // Tworzymy tablicę 5 fiszek-szkieletów do wyświetlenia podczas ładowania
  const skeletons = Array.from({ length: 5 }, (_, index) => (
    <Card key={`skeleton-${index}`} className="mb-4">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Szkielet dla przodu fiszki */}
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-8 w-full bg-muted rounded animate-pulse" />
          </div>

          {/* Separator */}
          <div className="h-px w-full bg-muted" />

          {/* Szkielet dla tyłu fiszki */}
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-16 w-full bg-muted rounded animate-pulse" />
          </div>

          {/* Szkielet dla przycisków akcji */}
          <div className="flex justify-end space-x-2 pt-2">
            <div className="h-9 w-28 bg-muted rounded animate-pulse" />
            <div className="h-9 w-24 bg-muted rounded animate-pulse" />
            <div className="h-9 w-28 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  ));

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-6">
        <div className="h-6 w-56 bg-muted rounded animate-pulse" />
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
      </div>

      {skeletons}
    </div>
  );
};

export default SkeletonLoader;
