<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Event;
use App\Services\ImageOptimizerService;

class GenerateExistingBannersThumbnails extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'events:optimize-banners {--force : Reprocess even if thumbnail already exists}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Optimize original event banners in-place and generate thumbnails for lists/dashboards';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $force = $this->option('force');
        $query = Event::whereNotNull('banner_path')->where('banner_path', '!=', '');

        if (!$force) {
            $query->where(function($q) {
                $q->whereNull('banner_thumbnail_path')->orWhere('banner_thumbnail_path', '');
            });
        }

        $events = $query->get();

        if ($events->isEmpty()) {
            $this->info('No event banners to optimize.');
            return 0;
        }

        $this->info("Found {$events->count()} events to process.");

        foreach ($events as $event) {
            $this->info("Processing event #{$event->id}: {$event->title}");
            
            try {
                $result = ImageOptimizerService::optimizeAndThumbnail(
                    $event->banner_path,
                    1000, // max width main
                    75,   // quality main
                    true, // generate thumbnail
                    240   // thumb width
                );

                $event->update([
                    'banner_path' => $result['path'],
                    'banner_thumbnail_path' => $result['thumbnail_path']
                ]);

                $this->info("Done: main_path={$result['path']}, thumb_path={$result['thumbnail_path']}");
            } catch (\Exception $e) {
                $this->error("Failed to process event #{$event->id}: " . $e->getMessage());
            }
        }

        $this->info('All banners processed successfully!');
        return 0;
    }
}
