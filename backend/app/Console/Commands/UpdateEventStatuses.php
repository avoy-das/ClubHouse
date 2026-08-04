<?php

namespace App\Console\Commands;

use App\Http\Controllers\EventController;
use Illuminate\Console\Command;

class UpdateEventStatuses extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'events:update-statuses';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically update event statuses (draft -> cancelled, published -> ongoing -> completed) based on current time.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        EventController::syncEventStatuses();
        $this->info('Event statuses updated successfully.');
        return Command::SUCCESS;
    }
}
