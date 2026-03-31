<?php

namespace App\Http\Controllers;

use App\Models\AppDeployVersion;
use Illuminate\Http\JsonResponse;

class AppVersionController extends ApiController
{
    /**
     * Public deploy version for SPA cache busting (no auth).
     */
    public function show(): JsonResponse
    {
        return $this->success([
            'version' => AppDeployVersion::currentVersion(),
        ], 'OK');
    }
}
