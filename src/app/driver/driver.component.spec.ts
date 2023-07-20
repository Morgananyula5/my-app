import { DriverService } from '../services/driver.service';

import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-driver',
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.css'],
})
export class DriverComponent implements OnInit {


  driverName: string = ''; // Initialize with an empty string
  driverId: string = 'DR1234';
  driverRating: number = 4.5;
  totalEarnings: number = 1500;
  completedTrips: number = 50;
  isAvailable: boolean = true;
  activeTrip: any; // Placeholder for active trip details



  constructor(private driverService: DriverService) {}

  ngOnInit() {
    this.driverName = this.driverService.getDriverName();
  }

  toggleAvailability() {
    this.isAvailable = !this.isAvailable;
  }

  completeTrip() {
    // Perform logic to mark the current trip as completed
    // You can update the trip status, calculate earnings, etc.
    this.activeTrip = null; // Reset active trip
  }
}
