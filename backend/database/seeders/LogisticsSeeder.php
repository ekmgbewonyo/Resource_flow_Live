<?php

namespace Database\Seeders;

use App\Models\Allocation;
use App\Models\DeliveryRoute;
use App\Models\Donation;
use App\Models\Logistic;
use App\Models\Request as AidRequest;
use App\Models\Trip;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

/**
 * Seeds sample logistics data for delivery routing and map views.
 * Creates: Users (driver, recipient, donor), Requests, Donations, Allocations,
 * DeliveryRoutes, Logistics (with location_updates), Trips (with GPS for Ghana).
 */
class LogisticsSeeder extends Seeder
{
    private const PASSWORD = 'svc_r3f70w-J3TM3ga';

    /** Ghana coordinates for map display */
    private const ACCRA = [5.6037, -0.1870];
    private const KUMASI = [6.6884, -1.6244];
    private const TAMALE = [9.4038, -0.8430];
    private const EN_ROUTE_ACCRA_KUMASI = [6.15, -0.92]; // Between Accra and Kumasi
    private const EN_ROUTE_KUMASI_TAMALE = [8.1, -1.2];  // Between Kumasi and Tamale

    public function run(): void
    {
        $admin = User::where('role', 'admin')->first();
        if (!$admin) {
            $this->command->warn('Admin user not found. Run UserSeeder first.');
            return;
        }

        // 1. Create driver, recipient, donor users if missing
        $driver = User::updateOrCreate(
            ['email' => 'driver@resourceflow.com'],
            [
                'name' => 'Kofi Driver',
                'email' => 'driver@resourceflow.com',
                'password' => \Illuminate\Support\Facades\Hash::make(self::PASSWORD),
                'password_changed_at' => now(),
                'role' => 'driver',
                'organization' => 'ResourceFlow Logistics',
                'phone' => '+233-24-1112233',
                'is_active' => true,
                'is_verified' => true,
                'verified_at' => now(),
            ]
        );

        $recipient = User::firstOrCreate(
            ['email' => 'recipient@resourceflow.com'],
            [
                'name' => 'Ama Recipient',
                'email' => 'recipient@resourceflow.com',
                'password' => \Illuminate\Support\Facades\Hash::make(self::PASSWORD),
                'password_changed_at' => now(),
                'role' => 'recipient',
                'organization' => null,
                'phone' => '+233-24-2223344',
                'address' => 'Community Center, Tamale, Northern Region',
                'is_active' => true,
                'is_verified' => true,
                'verified_at' => now(),
            ]
        );

        $donor = User::firstOrCreate(
            ['email' => 'donor@resourceflow.com'],
            [
                'name' => 'Acme Corp',
                'email' => 'donor@resourceflow.com',
                'password' => \Illuminate\Support\Facades\Hash::make(self::PASSWORD),
                'password_changed_at' => now(),
                'role' => 'donor_institution',
                'organization' => 'Acme Corporation',
                'phone' => '+233-24-3334455',
                'is_active' => true,
                'is_verified' => true,
                'verified_at' => now(),
            ]
        );

        // 2. Ensure warehouses exist
        $this->call(WarehouseSeeder::class);
        $accraWarehouse = Warehouse::where('city', 'Accra')->first();
        $kumasiWarehouse = Warehouse::where('city', 'Kumasi')->first();
        if (!$accraWarehouse || !$kumasiWarehouse) {
            $this->command->warn('Warehouses not found. Run WarehouseSeeder first.');
            return;
        }

        // 3. Create approved request
        $request = AidRequest::firstOrCreate(
            ['title' => 'Emergency Food Relief - Northern Region (Logistics Test)'],
            [
                'user_id' => $recipient->id,
                'description' => 'Urgent need for rice and cooking oil for displaced families in Tamale. Seeded for delivery routing demo.',
                'aid_type' => 'Health',
                'need_type' => 'emergency',
                'time_sensitivity' => 'critical',
                'recipient_type' => 'displaced_families',
                'region' => 'Northern',
                'quantity_required' => 200,
                'unit' => 'bags',
                'availability_gap' => 80,
                'urgency_score' => 85,
                'urgency_level' => 'Critical',
                'status' => 'approved',
                'funding_status' => 'partially_funded',
                'urgency_calculation_log' => ['seeded' => true],
            ]
        );

        // 4. Create donation
        $donation = Donation::firstOrCreate(
            [
                'user_id' => $donor->id,
                'item' => 'Rice (Logistics Demo)',
            ],
            [
                'type' => 'Goods',
                'quantity' => 200,
                'remaining_quantity' => 200,
                'unit' => 'bags',
                'description' => '50kg bags for emergency relief - logistics demo',
                'status' => 'Verified',
                'warehouse_id' => $accraWarehouse->id,
                'value' => 50000,
                'market_price' => 50000,
                'price_status' => 'Locked',
                'audited_price' => 50000,
                'date_received' => now()->subDays(3),
                'expiry_date' => now()->addYear(),
            ]
        );

        // 5. Create allocation
        $allocation = Allocation::firstOrCreate(
            [
                'request_id' => $request->id,
                'donation_id' => $donation->id,
            ],
            [
                'allocated_by' => $admin->id,
                'quantity_allocated' => 200,
                'status' => 'In Transit',
                'notes' => 'Seeded for logistics demo',
                'allocated_date' => now()->subDays(2),
                'expected_delivery_date' => now()->addDays(2),
            ]
        );

        // 6. Create delivery route
        $deliveryRoute = DeliveryRoute::firstOrCreate(
            ['route_name' => 'Accra → Tamale (Demo Route)'],
            [
                'warehouse_id' => $accraWarehouse->id,
                'destination_region' => 'Northern',
                'destination_city' => 'Tamale',
                'destination_address' => 'Community Center, Tamale Central',
                'distance_km' => 600,
                'estimated_duration_minutes' => 480,
                'status' => 'In Transit',
                'scheduled_date' => now(),
                'actual_departure_date' => now()->subHours(4),
                'driver_id' => $driver->id,
                'vehicle_id' => 'RF-001',
                'route_notes' => 'Seeded for map demo',
            ]
        );

        // 7. Create logistic with location_updates for map
        $locationUpdates = [
            ['latitude' => self::ACCRA[0], 'longitude' => self::ACCRA[1], 'timestamp' => now()->subHours(4)->toIso8601String()],
            ['latitude' => 5.85, 'longitude' => -0.5, 'timestamp' => now()->subHours(3)->toIso8601String()],
            ['latitude' => 6.15, 'longitude' => -0.92, 'timestamp' => now()->subHours(2)->toIso8601String()],
            ['latitude' => self::EN_ROUTE_ACCRA_KUMASI[0], 'longitude' => self::EN_ROUTE_ACCRA_KUMASI[1], 'timestamp' => now()->subHour()->toIso8601String()],
            ['latitude' => self::EN_ROUTE_KUMASI_TAMALE[0], 'longitude' => self::EN_ROUTE_KUMASI_TAMALE[1], 'timestamp' => now()->subMinutes(30)->toIso8601String()],
        ];

        $logistic = Logistic::firstOrCreate(
            ['tracking_number' => 'RF-TRK-' . substr(md5($allocation->id . 'log'), 0, 8)],
            [
                'allocation_id' => $allocation->id,
                'delivery_route_id' => $deliveryRoute->id,
                'status' => 'In Transit',
                'estimated_value' => 50000,
                'location_updates' => $locationUpdates,
                'last_location_update' => now()->subMinutes(30),
            ]
        );

        // 8. Create second request/donation/allocation/route for completed trip
        $request2 = AidRequest::firstOrCreate(
            ['title' => 'Medical Supplies - Ashanti (Completed Trip)'],
            [
                'user_id' => $recipient->id,
                'description' => 'Paracetamol and bandages for rural clinic.',
                'aid_type' => 'Health',
                'need_type' => 'ongoing',
                'region' => 'Ashanti',
                'quantity_required' => 100,
                'unit' => 'boxes',
                'status' => 'approved',
                'funding_status' => 'fully_funded',
                'urgency_calculation_log' => ['seeded' => true],
            ]
        );

        $donation2 = Donation::firstOrCreate(
            [
                'user_id' => $donor->id,
                'item' => 'Paracetamol (Logistics Demo)',
            ],
            [
                'type' => 'Goods',
                'quantity' => 100,
                'remaining_quantity' => 0,
                'unit' => 'boxes',
                'description' => 'Medical supplies - logistics demo',
                'status' => 'Verified',
                'warehouse_id' => $accraWarehouse->id,
                'value' => 25000,
                'date_received' => now()->subDays(5),
            ]
        );

        $allocation2 = Allocation::firstOrCreate(
            [
                'request_id' => $request2->id,
                'donation_id' => $donation2->id,
            ],
            [
                'allocated_by' => $admin->id,
                'quantity_allocated' => 100,
                'status' => 'In Transit',
                'allocated_date' => now()->subDays(3),
                'actual_delivery_date' => now()->subDays(2),
            ]
        );

        $route2 = DeliveryRoute::firstOrCreate(
            ['route_name' => 'Accra → Kumasi (Completed)'],
            [
                'warehouse_id' => $accraWarehouse->id,
                'destination_region' => 'Ashanti',
                'destination_city' => 'Kumasi',
                'destination_address' => 'Rural Clinic, Kumasi',
                'distance_km' => 270,
                'status' => 'Delivered',
                'scheduled_date' => now()->subDays(2),
                'actual_departure_date' => now()->subDays(2),
                'actual_arrival_date' => now()->subDays(2),
                'driver_id' => $driver->id,
            ]
        );

        // Create trips with GPS for map (each trip = unique request)
        $tripsToCreate = [
            [
                'request' => $request,
                'allocation' => $allocation,
                'route' => $deliveryRoute,
                'status' => 'started',
                'current_lat' => self::EN_ROUTE_KUMASI_TAMALE[0],
                'current_lng' => self::EN_ROUTE_KUMASI_TAMALE[1],
                'started_at' => now()->subHours(4),
            ],
            [
                'request' => $request2,
                'allocation' => $allocation2,
                'route' => $route2,
                'status' => 'completed',
                'current_lat' => self::KUMASI[0],
                'current_lng' => self::KUMASI[1],
                'started_at' => now()->subDays(2),
                'arrived_at' => now()->subDays(2)->addHours(3),
                'completed_at' => now()->subDays(2)->addHours(4),
            ],
        ];

        foreach ($tripsToCreate as $t) {
            Trip::firstOrCreate(
                [
                    'driver_id' => $driver->id,
                    'request_id' => $t['request']->id,
                ],
                [
                    'allocation_id' => $t['allocation']->id,
                    'delivery_route_id' => $t['route']->id,
                    'status' => $t['status'],
                    'current_lat' => $t['current_lat'],
                    'current_lng' => $t['current_lng'],
                    'started_at' => $t['started_at'] ?? null,
                    'arrived_at' => $t['arrived_at'] ?? null,
                    'completed_at' => $t['completed_at'] ?? null,
                ]
            );
        }

        $this->command->info('Logistics sample data seeded. Trips with GPS: ' . Trip::count());
        $this->command->info('Login as driver@resourceflow.com or admin to view Delivery Dashboard map.');
    }
}
