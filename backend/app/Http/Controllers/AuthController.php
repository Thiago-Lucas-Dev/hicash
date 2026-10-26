<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function csrf(Request $request): JsonResponse
    {
        return response()->json(['token' => $request->session()->token()]);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials)) {
            throw ValidationException::withMessages(['email' => 'Credenciais inválidas.']);
        }

        $request->session()->regenerate();

        return response()->json(['user' => $request->user()->only(['id', 'name', 'email'])]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->only(['id', 'name', 'email'])]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Sessão encerrada.']);
    }
}
