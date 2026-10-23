<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $groups = [
            ['Moradia','expense',true],['Alimentação','expense',true],['Transporte','expense',true],
            ['Saúde','expense',true],['Educação','expense',true],['Lazer','expense',false],
            ['Compras','expense',false],['Pets','expense',false],['Outros','expense',false],
            ['Salário','income',false],['Freelance','income',false],['Investimentos','income',false],
            ['Outros','income',false],
        ];
        foreach ($groups as [$name,$type,$essential]) DB::table('categories')->updateOrInsert(
            ['name'=>$name,'type'=>$type],['essential'=>$essential,'created_at'=>now(),'updated_at'=>now()]);
    }
}
