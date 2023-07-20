import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DriverService {
  private driverName: string = '';
  private driverDetails: any = null;

  setDriverName(name: string) {
    this.driverName = name;
  }

  getDriverName() {
    return this.driverName;
  }

  setDriverDetails(details: any) {
    this.driverDetails = details;
  }

  getDriverDetails() {
    return this.driverDetails;
  }
}
