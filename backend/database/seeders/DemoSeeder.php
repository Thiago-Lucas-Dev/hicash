<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $account = DB::table('accounts')->insertGetId(['name'=>'Conta demonstração','opening_balance'=>'1500.00','created_at'=>now(),'updated_at'=>now()]);
        $today=now('America/Sao_Paulo')->toDateString();
        foreach ([
            ['Salário','income','Salário mensal','3500.00','completed'],
            ['Alimentação','expense','Mercado','280.00','completed'],
            ['Transporte','expense','Gasolina','120.00','completed'],
            ['Moradia','expense','Aluguel','900.00','pending'],
        ] as [$name,$type,$description,$amount,$status]) {
            DB::table('transactions')->insert(['account_id'=>$account,'category_id'=>DB::table('categories')->where('name',$name)->where('type',$type)->value('id'),
                'type'=>$type,'description'=>$description,'amount'=>$amount,'reference_date'=>$today,'status'=>$status,
                'payment_method'=>'pix','origin'=>'manual','created_at'=>now(),'updated_at'=>now()]);
        }
    }
}
