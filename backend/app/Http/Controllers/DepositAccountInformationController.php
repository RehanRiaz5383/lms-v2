<?php

namespace App\Http\Controllers;

use App\Models\DepositAccountInformation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DepositAccountInformationController extends ApiController
{
    public function show(): JsonResponse
    {
        $row = DepositAccountInformation::query()->orderBy('id')->first();

        return $this->success([
            'content_html' => $row?->content_html ?? '',
            'updated_at' => $row?->updated_at,
        ], 'Deposit account information');
    }

    public function update(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'content_html' => 'nullable|string',
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Validation failed');
        }

        $row = DepositAccountInformation::query()->orderBy('id')->first();
        if (! $row) {
            $row = new DepositAccountInformation();
        }

        $row->fill([
            'content_html' => $validated['content_html'] ?? '',
            'updated_by_user_id' => $request->user()?->id,
        ]);
        $row->save();

        return $this->success([
            'content_html' => $row->content_html ?? '',
            'updated_at' => $row->updated_at,
        ], 'Saved');
    }
}

