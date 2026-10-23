<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $t) {
            $t->id(); $t->string('name'); $t->decimal('opening_balance', 15, 2)->default(0); $t->timestamps(); $t->softDeletes();
        });
        Schema::create('categories', function (Blueprint $t) {
            $t->id(); $t->string('name'); $t->enum('type', ['income','expense']); $t->boolean('essential')->default(false); $t->timestamps(); $t->softDeletes();
            $t->unique(['name','type']);
        });
        Schema::create('transactions', function (Blueprint $t) {
            $t->id(); $t->foreignId('account_id')->constrained(); $t->foreignId('category_id')->constrained();
            $t->foreignId('recurrence_rule_id')->nullable(); $t->date('occurrence_date')->nullable();
            $t->enum('type', ['income','expense']); $t->string('description'); $t->decimal('amount', 15, 2);
            $t->date('reference_date'); $t->enum('status', ['pending','completed'])->default('completed');
            $t->enum('payment_method', ['cash','debit','pix','bank_transfer','credit_card'])->default('pix');
            $t->text('note')->nullable(); $t->enum('origin', ['manual','chatbot','recurrence'])->default('manual');
            $t->timestamps(); $t->softDeletes();
            $t->unique(['recurrence_rule_id','occurrence_date']);
            $t->index(['reference_date','status']);
        });
        Schema::create('transfers', function (Blueprint $t) {
            $t->id(); $t->foreignId('from_account_id')->constrained('accounts'); $t->foreignId('to_account_id')->constrained('accounts');
            $t->decimal('amount',15,2); $t->date('reference_date'); $t->text('note')->nullable(); $t->timestamps(); $t->softDeletes();
        });
        Schema::create('category_aliases', function (Blueprint $t) {
            $t->id(); $t->string('keyword')->unique(); $t->foreignId('category_id')->constrained(); $t->timestamps();
        });
        Schema::create('category_budgets', function (Blueprint $t) {
            $t->id(); $t->foreignId('category_id')->constrained(); $t->unsignedSmallInteger('year'); $t->unsignedTinyInteger('month');
            $t->decimal('amount',15,2); $t->unsignedTinyInteger('alert_percent')->default(80); $t->timestamps();
            $t->unique(['category_id','year','month']);
        });
        Schema::create('recurrence_rules', function (Blueprint $t) {
            $t->id(); $t->foreignId('account_id')->constrained(); $t->foreignId('category_id')->constrained();
            $t->enum('type',['income','expense']); $t->string('description'); $t->decimal('amount',15,2);
            $t->enum('payment_method',['cash','debit','pix','bank_transfer','credit_card'])->default('pix');
            $t->enum('frequency',['weekly','monthly','yearly']); $t->date('start_date'); $t->date('end_date')->nullable();
            $t->date('next_date'); $t->boolean('active')->default(true); $t->timestamps(); $t->softDeletes();
        });
        Schema::create('chat_messages', function (Blueprint $t) {
            $t->id(); $t->enum('role',['user','assistant']); $t->text('content'); $t->json('payload')->nullable(); $t->timestamps();
        });
        Schema::create('chat_state', function (Blueprint $t) {
            $t->id(); $t->json('pending')->nullable(); $t->json('context')->nullable(); $t->timestamps();
        });
        \Illuminate\Support\Facades\DB::table('chat_state')->insert(['id'=>1,'created_at'=>now(),'updated_at'=>now()]);
        Schema::create('settings', function (Blueprint $t) { $t->string('key')->primary(); $t->json('value'); $t->timestamps(); });
        Schema::create('audit_logs', function (Blueprint $t) {
            $t->id(); $t->string('entity_type'); $t->unsignedBigInteger('entity_id'); $t->string('action');
            $t->unsignedBigInteger('source_audit_id')->nullable();
            $t->json('before')->nullable(); $t->json('after')->nullable(); $t->timestamps();
        });
        Schema::create('processed_commands', function (Blueprint $t) {
            $t->id(); $t->string('command_id')->unique(); $t->json('response'); $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['processed_commands','audit_logs','settings','chat_state','chat_messages','recurrence_rules','category_budgets','category_aliases','transfers','transactions','categories','accounts'] as $table) Schema::dropIfExists($table);
    }
};
