import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { RequestService } from '../services/request.service';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css'],
})
export class CustomerComponent implements OnInit {
  destination: string = '';
  customerName: string = 'User'; // Set the customer's name here
  currentRide: any;
  rideAccepted: boolean = false;
  rating: number = 0;
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  geocoder: any = null;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private driverService: DriverService
  ) {}

  ngOnInit() {
    this.currentRide = null;
    this.initMap();
    this.initializeWebSocket();
  }

  logout() {
    alert('Logged out');
    this.router.navigate(['/']);
  }

  requestRide() {
    const requestPayload = {
      destination: this.destination,
      customer: this.customerName,
    };

    this.socket.emit('rideRequest', requestPayload);
    alert('Ride requested');
  }

  cancelRide() {
    this.socket.emit('cancelRide');
    alert('Ride canceled');
  }

  searchDestination() {
    if (this.destination && this.geocoder) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: this.destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], { icon: this.getRandomCustomerIcon() }).addTo(this.map).bindPopup('Customer');

          this.driverMarkers.forEach((driverMarker) => {
            this.map.removeLayer(driverMarker);
          });
          this.driverMarkers = [];

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map(driver => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          }).addTo(this.map).bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline([[center.lat(), center.lng()], [nearestDriver.lat, nearestDriver.lng]], { color: 'red' }).addTo(this.map);

          const requestPayload = {
            destination: this.destination,
            customer: this.customerName,
          };

          this.socket.emit('rideRequest', requestPayload);
          alert('Ride requested');
        }
      });
    }
  }

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map(this.mapContainer.nativeElement).setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.geocoder = new google.maps.Geocoder();
  }

  getDriverLocation(center: any, distance: number) {
    const latDistance = distance * 0.009;
    const lngDistance = (distance * 0.009) / Math.cos((Math.PI / 180) * center.lat());

    const lat = center.lat() + latDistance * (Math.random() < 0.5 ? -1 : 1);
    const lng = center.lng() + lngDistance * (Math.random() < 0.5 ? -1 : 1);

    return { lat, lng };
  }

  getNearestDriver(center: any, driverLocations: any[]) {
    let nearestDriver = driverLocations[0];
    let nearestDistance = this.calculateDistance(center, nearestDriver);

    for (let i = 1; i < driverLocations.length; i++) {
      const distance = this.calculateDistance(center, driverLocations[i]);
      if (distance < nearestDistance) {
        nearestDriver = driverLocations[i];
        nearestDistance = distance;
      }
    }

    return nearestDriver;
  }

  calculateDistance(point1: any, point2: any) {
    const latDiff = Math.abs(point1.lat() - point2.lat);
    const lngDiff = Math.abs(point1.lng() - point2.lng);

    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  getRandomDriverIcon() {
    return L.divIcon({
      html: '<i class="fas fa-truck fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  getRandomCustomerIcon() {
    return L.divIcon({
      html: '<i class="fas fa-user fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  initializeWebSocket() {
    const socketUrl = 'http://localhost:3000'; // Replace with your backend URL
    this.socket = io(socketUrl) as Socket; // Use the io object to establish the socket connection

    this.socket.on('ride_accepted', (rideDetails: any) => {
      this.currentRide = {
        driver: 'Morgy cloudd', // Set the driver name
        truck: 'Large Truck', // Set the truck type
        licensePlate: 'KCA 678U', // Set the license plate
        destination: rideDetails.destination,
      };
      this.rideAccepted = true;
      alert('Ride accepted by Morgy cloudd');
    });

    this.socket.on('ride_rejected', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      alert('No drivers available');
    });

    this.socket.on('ride_canceled', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      alert('Ride canceled');
    });
  }

  submitRating() {
    this.socket.emit('customerRatingUpdate', this.rating);
    alert('Rating submitted');
  }
}






/*import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { RequestService } from '../services/request.service';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css'],
})
export class CustomerComponent implements OnInit {
  destination: string = '';
  customerName: string = 'Krystal Vuyanzi'; // Set the customer's name here
  currentRide: any;
  rideAccepted: boolean = false;
  rating: number = 0;
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  geocoder: any = null;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private driverService: DriverService
  ) {}

  ngOnInit() {
    this.currentRide = null;
    this.initMap();
    this.initializeWebSocket();
  }

  logout() {
    alert('Logged out');
    this.router.navigate(['/']);
  }

  requestRide() {
    const requestPayload = {
      destination: this.destination,
      customer: this.customerName,
    };

    this.socket.emit('rideRequest', requestPayload);
    alert('Ride requested');
  }

  cancelRide() {
    this.socket.emit('cancelRide');
    alert('Ride canceled');
  }

  searchDestination() {
    if (this.destination && this.geocoder) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: this.destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], { icon: this.getRandomCustomerIcon() }).addTo(this.map).bindPopup('Customer');

          this.driverMarkers.forEach((driverMarker) => {
            this.map.removeLayer(driverMarker);
          });
          this.driverMarkers = [];

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map(driver => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          }).addTo(this.map).bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline([[center.lat(), center.lng()], [nearestDriver.lat, nearestDriver.lng]], { color: 'red' }).addTo(this.map);

          const requestPayload = {
            destination: this.destination,
            customer: this.customerName,
          };

          this.socket.emit('rideRequest', requestPayload);
          alert('Ride requested');
        }
      });
    }
  }

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map(this.mapContainer.nativeElement).setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.geocoder = new google.maps.Geocoder();
  }

  getDriverLocation(center: any, distance: number) {
    const latDistance = distance * 0.009;
    const lngDistance = (distance * 0.009) / Math.cos((Math.PI / 180) * center.lat());

    const lat = center.lat() + latDistance * (Math.random() < 0.5 ? -1 : 1);
    const lng = center.lng() + lngDistance * (Math.random() < 0.5 ? -1 : 1);

    return { lat, lng };
  }

  getNearestDriver(center: any, driverLocations: any[]) {
    let nearestDriver = driverLocations[0];
    let nearestDistance = this.calculateDistance(center, nearestDriver);

    for (let i = 1; i < driverLocations.length; i++) {
      const distance = this.calculateDistance(center, driverLocations[i]);
      if (distance < nearestDistance) {
        nearestDriver = driverLocations[i];
        nearestDistance = distance;
      }
    }

    return nearestDriver;
  }

  calculateDistance(point1: any, point2: any) {
    const latDiff = Math.abs(point1.lat() - point2.lat);
    const lngDiff = Math.abs(point1.lng() - point2.lng);

    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  getRandomDriverIcon() {
    return L.divIcon({
      html: '<i class="fas fa-truck fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  getRandomCustomerIcon() {
    return L.divIcon({
      html: '<i class="fas fa-user fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  initializeWebSocket() {
    const socketUrl = 'http://localhost:5000'; // Replace with your backend URL
    this.socket = io(socketUrl) as Socket; // Use the io object to establish the socket connection

    this.socket.on('ride_accepted', (rideDetails: any) => {
      this.currentRide = {
        driver: 'Morgy cloudd', // Set the driver name
        truck: 'Large Truck', // Set the truck type
        licensePlate: 'KCA 678U', // Set the license plate
        destination: rideDetails.destination,
      };
      this.rideAccepted = true;
      alert('Ride accepted by Morgy cloudd');
    });

    this.socket.on('ride_rejected', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      alert('No drivers available');
    });

    this.socket.on('ride_canceled', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      alert('Ride canceled');
    });
  }

  submitRating() {
    this.socket.emit('customerRatingUpdate', this.rating);
    alert('Rating submitted');
  }
}
*/





/*
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { RequestService } from '../services/request.service';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css'],
})
export class CustomerComponent implements OnInit {
  destination: string = '';
  customerName: string = 'Krystal Vuyanzi'; // Set the customer's name here
  currentRide: any;
  rideAccepted: boolean = false;
  rating: number = 0;
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  geocoder: any = null;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private driverService: DriverService
  ) {}

  ngOnInit() {
    this.currentRide = null;
    this.initMap();
    this.initializeWebSocket();
  }

  logout() {
    alert('Logged out');
    this.router.navigate(['/']);
  }

  requestRide() {
    const requestPayload = {
      destination: this.destination,
      customer: this.customerName,
    };

    this.socket.emit('rideRequest', requestPayload);
    alert('Ride requested');
  }

  cancelRide() {
    this.socket.emit('cancelRide');
    alert('Ride canceled');
  }

  searchDestination() {
    if (this.destination && this.geocoder) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: this.destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], { icon: this.getRandomCustomerIcon() }).addTo(this.map).bindPopup('Customer');

          this.driverMarkers.forEach((driverMarker) => {
            this.map.removeLayer(driverMarker);
          });
          this.driverMarkers = [];

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map(driver => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          }).addTo(this.map).bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline([[center.lat(), center.lng()], [nearestDriver.lat, nearestDriver.lng]], { color: 'red' }).addTo(this.map);

          const requestPayload = {
            destination: this.destination,
            customer: this.customerName,
          };

          this.socket.emit('rideRequest', requestPayload);
          alert('Ride requested');
        }
      });
    }
  }

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map(this.mapContainer.nativeElement).setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.geocoder = new google.maps.Geocoder();
  }

  getDriverLocation(center: any, distance: number) {
    const latDistance = distance * 0.009;
    const lngDistance = (distance * 0.009) / Math.cos((Math.PI / 180) * center.lat());

    const lat = center.lat() + latDistance * (Math.random() < 0.5 ? -1 : 1);
    const lng = center.lng() + lngDistance * (Math.random() < 0.5 ? -1 : 1);

    return { lat, lng };
  }

  getNearestDriver(center: any, driverLocations: any[]) {
    let nearestDriver = driverLocations[0];
    let nearestDistance = this.calculateDistance(center, nearestDriver);

    for (let i = 1; i < driverLocations.length; i++) {
      const distance = this.calculateDistance(center, driverLocations[i]);
      if (distance < nearestDistance) {
        nearestDriver = driverLocations[i];
        nearestDistance = distance;
      }
    }

    return nearestDriver;
  }

  calculateDistance(point1: any, point2: any) {
    const latDiff = Math.abs(point1.lat() - point2.lat);
    const lngDiff = Math.abs(point1.lng() - point2.lng);

    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  getRandomDriverIcon() {
    return L.divIcon({
      html: '<i class="fas fa-truck fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  getRandomCustomerIcon() {
    return L.divIcon({
      html: '<i class="fas fa-user fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  initializeWebSocket() {
    const socketUrl = 'http://localhost:3000'; // Replace with your backend URL
    this.socket = io(socketUrl) as Socket; // Use the io object to establish the socket connection

    this.socket.on('ride_accepted', (rideDetails: any) => {
      this.currentRide = {
        driver: 'Morgy cloudd', // Set the driver name
        truck: 'Large Truck', // Set the truck type
        licensePlate: 'KCA 678U', // Set the license plate
        destination: rideDetails.destination,
      };
      this.rideAccepted = true;
      alert('Ride accepted by Morgy cloudd');
    });

    this.socket.on('ride_rejected', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      alert('No drivers available');
    });

    this.socket.on('ride_canceled', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      alert('Ride canceled');
    });
  }

  submitRating() {
    this.socket.emit('customerRatingUpdate', this.rating);
    alert('Rating submitted');
  }
}
*/

/*
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { RequestService } from '../services/request.service';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';


declare var google: any;

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css'],
})
export class CustomerComponent implements OnInit {
  destination: string = '';
  customerName: string = 'Krystal Vuyanzi'; // Set the customer's name here
  currentRide: any;
  rideAccepted: boolean = false;
  rating: number = 0;
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  geocoder: any = null;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private driverService: DriverService
  ) {}

  ngOnInit() {
    this.currentRide = null;
    this.initMap();
    this.initializeWebSocket();
  }

  logout() {
    alert('Logged out');
    this.router.navigate(['/']);
  }

  requestRide() {
    const requestPayload = {
      destination: this.destination,
      customer: this.customerName,
    };

    this.socket.emit('rideRequest', requestPayload);
    alert('Ride requested');
  }

  cancelRide() {
    this.socket.emit('cancelRide');
    alert('Ride canceled');
  }

  searchDestination() {
    if (this.destination && this.geocoder) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: this.destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], { icon: this.getRandomCustomerIcon() }).addTo(this.map).bindPopup('Customer');

          this.driverMarkers.forEach((driverMarker) => {
            this.map.removeLayer(driverMarker);
          });
          this.driverMarkers = [];

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map(driver => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          }).addTo(this.map).bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline([[center.lat(), center.lng()], [nearestDriver.lat, nearestDriver.lng]], { color: 'red' }).addTo(this.map);

          const requestPayload = {
            destination: this.destination,
            customer: this.customerName,
          };

          this.socket.emit('rideRequest', requestPayload);
          alert('Ride requested');
        }
      });
    }
  }

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map(this.mapContainer.nativeElement).setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.geocoder = new google.maps.Geocoder();
  }

  getDriverLocation(center: any, distance: number) {
    const latDistance = distance * 0.009;
    const lngDistance = (distance * 0.009) / Math.cos((Math.PI / 180) * center.lat());

    const lat = center.lat() + latDistance * (Math.random() < 0.5 ? -1 : 1);
    const lng = center.lng() + lngDistance * (Math.random() < 0.5 ? -1 : 1);

    return { lat, lng };
  }

  getNearestDriver(center: any, driverLocations: any[]) {
    let nearestDriver = driverLocations[0];
    let nearestDistance = this.calculateDistance(center, nearestDriver);

    for (let i = 1; i < driverLocations.length; i++) {
      const distance = this.calculateDistance(center, driverLocations[i]);
      if (distance < nearestDistance) {
        nearestDriver = driverLocations[i];
        nearestDistance = distance;
      }
    }

    return nearestDriver;
  }

  calculateDistance(point1: any, point2: any) {
    const latDiff = Math.abs(point1.lat() - point2.lat);
    const lngDiff = Math.abs(point1.lng() - point2.lng);

    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  getRandomDriverIcon() {
    return L.divIcon({
      html: '<i class="fas fa-truck fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  getRandomCustomerIcon() {
    return L.divIcon({
      html: '<i class="fas fa-user fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  initializeWebSocket() {
    const socketUrl = 'http://localhost:3000'; // Replace with your backend URL
    this.socket = io(socketUrl) as Socket; // Use the io object to establish the socket connection

    this.socket.on('ride_accepted', (rideDetails: any) => {
      this.currentRide = {
        driver: 'Morgy cloudd', // Set the driver name
        truck: 'Large Truck', // Set the truck type
        licensePlate: 'KCA 678U', // Set the license plate
        destination: rideDetails.destination,
      };
      this.rideAccepted = true;
      alert('Ride accepted by Morgy cloudd');
    });

    this.socket.on('ride_rejected', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      alert('No drivers available');
    });

    this.socket.on('ride_canceled', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      alert('Ride canceled');
    });
  }

  submitRating() {
    this.socket.emit('customerRatingUpdate', this.rating);
    alert('Rating submitted');
  }
}
*/

/*import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { RequestService } from '../services/request.service';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css'],
})
export class CustomerComponent implements OnInit {
  destination: string = '';
  customerName: string = 'Krystal Vuyanzi'; // Set the customer's name here
  currentRide: any;
  rideAccepted: boolean = false;
  rating: number = 0;
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  geocoder: any = null;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private driverService: DriverService
  ) {}

  ngOnInit() {
    this.currentRide = null;
    this.initMap();
    this.initializeWebSocket();
  }

  logout() {
    alert('Logged out');
    this.router.navigate(['/']);
  }

  requestRide() {
    const requestPayload = {
      destination: this.destination,
      customer: this.customerName,
    };

    this.socket.emit('rideRequest', requestPayload);
    alert('Ride requested');
  }

  cancelRide() {
    this.socket.emit('cancelRide');
    alert('Ride canceled');
  }

  searchDestination() {
    if (this.destination && this.geocoder) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: this.destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], { icon: this.getRandomCustomerIcon() }).addTo(this.map).bindPopup('Customer');

          this.driverMarkers.forEach((driverMarker) => {
            this.map.removeLayer(driverMarker);
          });
          this.driverMarkers = [];

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map(driver => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          }).addTo(this.map).bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline([[center.lat(), center.lng()], [nearestDriver.lat, nearestDriver.lng]], { color: 'red' }).addTo(this.map);

          const requestPayload = {
            destination: this.destination,
            customer: this.customerName,
          };

          this.socket.emit('rideRequest', requestPayload);
          alert('Ride requested');
        }
      });
    }
  }

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map(this.mapContainer.nativeElement).setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.geocoder = new google.maps.Geocoder();
  }

  getDriverLocation(center: any, distance: number) {
    const latDistance = distance * 0.009;
    const lngDistance = (distance * 0.009) / Math.cos((Math.PI / 180) * center.lat());

    const lat = center.lat() + latDistance * (Math.random() < 0.5 ? -1 : 1);
    const lng = center.lng() + lngDistance * (Math.random() < 0.5 ? -1 : 1);

    return { lat, lng };
  }

  getNearestDriver(center: any, driverLocations: any[]) {
    let nearestDriver = driverLocations[0];
    let nearestDistance = this.calculateDistance(center, nearestDriver);

    for (let i = 1; i < driverLocations.length; i++) {
      const distance = this.calculateDistance(center, driverLocations[i]);
      if (distance < nearestDistance) {
        nearestDriver = driverLocations[i];
        nearestDistance = distance;
      }
    }

    return nearestDriver;
  }

  calculateDistance(point1: any, point2: any) {
    const latDiff = Math.abs(point1.lat() - point2.lat);
    const lngDiff = Math.abs(point1.lng() - point2.lng);

    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  getRandomDriverIcon() {
    return L.divIcon({
      html: '<i class="fas fa-truck fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  getRandomCustomerIcon() {
    return L.divIcon({
      html: '<i class="fas fa-user fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  initializeWebSocket() {
    const socketUrl = 'http://localhost:3000'; // Replace with your backend URL
    this.socket = io(socketUrl) as Socket; // Use the io object to establish the socket connection

    this.socket.on('ride_accepted', (rideDetails: any) => {
      this.currentRide = {
        driver: 'Morgy cloudd', // Set the driver name
        truck: 'Large Truck', // Set the truck type
        licensePlate: 'KCA 678U', // Set the license plate
        destination: rideDetails.destination,
      };
      this.rideAccepted = true;
      alert('Ride accepted by Morgy cloudd');
    });

    this.socket.on('ride_rejected', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      alert('No drivers available');
    });

    this.socket.on('ride_canceled', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      alert('Ride canceled');
    });
  }

  submitRating() {
    this.socket.emit('customerRatingUpdate', this.rating);
    alert('Rating submitted');
  }
}

*/

/*
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { RequestService } from '../services/request.service';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css'],
})
export class CustomerComponent implements OnInit {
  destination: string = '';
  customerName: string = 'Krystal Vuyanzi'; // Set the customer's name here
  currentRide: any;
  rideAccepted: boolean = false;
  rideRejected: boolean = false;
  rating: number = 0;
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  geocoder: any = null;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private driverService: DriverService
  ) {}

  ngOnInit() {
    this.currentRide = null;
    this.initMap();
    this.initializeWebSocket();
  }

  logout() {
    alert('Logged out');
    this.router.navigate(['/']);
  }

  requestRide() {
    const requestPayload = {
      destination: this.destination,
      customer: this.customerName,
    };

    this.socket.emit('rideRequest', requestPayload);
    alert('Ride requested');
  }

  cancelRide() {
    this.socket.emit('cancelRide');
    alert('Ride canceled');
  }

  searchDestination() {
    if (this.destination && this.geocoder) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: this.destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], { icon: this.getRandomCustomerIcon() }).addTo(this.map).bindPopup('Customer');

          this.driverMarkers.forEach((driverMarker) => {
            this.map.removeLayer(driverMarker);
          });
          this.driverMarkers = [];

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map(driver => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          }).addTo(this.map).bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline([[center.lat(), center.lng()], [nearestDriver.lat, nearestDriver.lng]], { color: 'red' }).addTo(this.map);

          const requestPayload = {
            destination: this.destination,
            customer: this.customerName,
          };

          this.socket.emit('rideRequest', requestPayload);
          alert('Ride requested');
        }
      });
    }
  }

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map(this.mapContainer.nativeElement).setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.geocoder = new google.maps.Geocoder();
  }

  getDriverLocation(center: any, distance: number) {
    const latDistance = distance * 0.009;
    const lngDistance = (distance * 0.009) / Math.cos((Math.PI / 180) * center.lat());

    const lat = center.lat() + latDistance * (Math.random() < 0.5 ? -1 : 1);
    const lng = center.lng() + lngDistance * (Math.random() < 0.5 ? -1 : 1);

    return { lat, lng };
  }

  getNearestDriver(center: any, driverLocations: any[]) {
    let nearestDriver = driverLocations[0];
    let nearestDistance = this.calculateDistance(center, nearestDriver);

    for (let i = 1; i < driverLocations.length; i++) {
      const distance = this.calculateDistance(center, driverLocations[i]);
      if (distance < nearestDistance) {
        nearestDriver = driverLocations[i];
        nearestDistance = distance;
      }
    }

    return nearestDriver;
  }

  calculateDistance(point1: any, point2: any) {
    const latDiff = Math.abs(point1.lat() - point2.lat);
    const lngDiff = Math.abs(point1.lng() - point2.lng);

    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  getRandomDriverIcon() {
    return L.divIcon({
      html: '<i class="fas fa-truck fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  getRandomCustomerIcon() {
    return L.divIcon({
      html: '<i class="fas fa-user fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  initializeWebSocket() {
    const socketUrl = 'http://localhost:3000'; // Replace with your backend URL
    this.socket = io(socketUrl) as Socket; // Use the io object to establish the socket connection

    this.socket.on('ride_accepted', (rideDetails: any) => {
      this.currentRide = {
        driver: 'Morgy cloudd', // Set the driver name
        truck: 'Large Truck', // Set the truck type
        licensePlate: 'KCA 678U', // Set the license plate
        destination: rideDetails.destination,
      };
      this.rideAccepted = true;
      this.rideRejected = false;
      alert('Ride accepted by Morgy cloudd');
    });

    this.socket.on('ride_rejected', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      this.rideRejected = true;
      alert('No drivers available');
    });

    this.socket.on('ride_canceled', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      this.rideRejected = false;
      alert('Ride canceled');
    });
  }

  submitRating() {
    this.socket.emit('customerRatingUpdate', this.rating);
    alert('Rating submitted');
  }
}

*/

/*import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { RequestService } from '../services/request.service';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css'],
})
export class CustomerComponent implements OnInit {
  destination: string = '';
  customerName: string = '';
  currentRide: any;
  rideAccepted: boolean = false;
  rideRejected: boolean = false;
  rating: number = 0;
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  geocoder: any = null;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private driverService: DriverService
  ) {}

  ngOnInit() {
    this.customerName = this.driverService.getDriverName();
    this.currentRide = null;
    this.initMap();
    this.initializeWebSocket();
  }

  logout() {
    alert('Logged out');
    this.router.navigate(['/']);
  }

  requestRide() {
    const requestPayload = {
      destination: this.destination,
      customer: this.customerName,
    };

    this.socket.emit('rideRequest', requestPayload);
    alert('Ride requested');
  }

  cancelRide() {
    this.socket.emit('cancelRide');
    alert('Ride canceled');
  }

  searchDestination() {
    if (this.destination && this.geocoder) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: this.destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], { icon: this.getRandomCustomerIcon() }).addTo(this.map).bindPopup('Customer');

          this.driverMarkers.forEach((driverMarker) => {
            this.map.removeLayer(driverMarker);
          });
          this.driverMarkers = [];

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map(driver => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          }).addTo(this.map).bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline([[center.lat(), center.lng()], [nearestDriver.lat, nearestDriver.lng]], { color: 'red' }).addTo(this.map);

          const requestPayload = {
            destination: this.destination,
            customer: this.customerName,
          };

          this.socket.emit('rideRequest', requestPayload);
          alert('Ride requested');
        }
      });
    }
  }

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map(this.mapContainer.nativeElement).setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.geocoder = new google.maps.Geocoder();
  }

  getDriverLocation(center: any, distance: number) {
    const latDistance = distance * 0.009;
    const lngDistance = (distance * 0.009) / Math.cos((Math.PI / 180) * center.lat());

    const lat = center.lat() + latDistance * (Math.random() < 0.5 ? -1 : 1);
    const lng = center.lng() + lngDistance * (Math.random() < 0.5 ? -1 : 1);

    return { lat, lng };
  }

  getNearestDriver(center: any, driverLocations: any[]) {
    let nearestDriver = driverLocations[0];
    let nearestDistance = this.calculateDistance(center, nearestDriver);

    for (let i = 1; i < driverLocations.length; i++) {
      const distance = this.calculateDistance(center, driverLocations[i]);
      if (distance < nearestDistance) {
        nearestDriver = driverLocations[i];
        nearestDistance = distance;
      }
    }

    return nearestDriver;
  }

  calculateDistance(point1: any, point2: any) {
    const latDiff = Math.abs(point1.lat() - point2.lat);
    const lngDiff = Math.abs(point1.lng() - point2.lng);

    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  getRandomDriverIcon() {
    return L.divIcon({
      html: '<i class="fas fa-truck fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  getRandomCustomerIcon() {
    return L.divIcon({
      html: '<i class="fas fa-user fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  initializeWebSocket() {
    const socketUrl = 'http://localhost:3000'; // Replace with your backend URL
    this.socket = io(socketUrl) as Socket; // Use the io object to establish the socket connection

    this.socket.on('ride_accepted', (rideDetails: any) => {
      this.currentRide = {
        driver: 'Morgy cloudd', // Set the driver name
        truck: 'Large Truck', // Set the truck type
        licensePlate: 'KCA 678U', // Set the license plate
        destination: rideDetails.destination,
      };
      this.rideAccepted = true;
      this.rideRejected = false;
      alert('Ride accepted by Morgy cloudd');
    });

    this.socket.on('ride_rejected', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      this.rideRejected = true;
      alert('No drivers available');
    });

    this.socket.on('ride_canceled', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      this.rideRejected = false;
      alert('Ride canceled');
    });
  }

  submitRating() {
    this.socket.emit('customerRatingUpdate', this.rating);
    alert('Rating submitted');
  }
}
*/



/*
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { RequestService } from '../services/request.service';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css'],
})
export class CustomerComponent implements OnInit {
  destination: string = '';
  customerName: string = '';
  currentRide: any;
  rideAccepted: boolean = false;
  rideRejected: boolean = false;
  rating: number = 0;
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  geocoder: any = null;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private driverService: DriverService
  ) {}

  ngOnInit() {
    this.customerName = this.driverService.getDriverName();
    this.currentRide = null;
    this.initMap();
    this.initializeWebSocket();
  }

  logout() {
    alert('Logged out');
    this.router.navigate(['/']);
  }

  requestRide() {
    const requestPayload = {
      destination: this.destination,
      customer: this.customerName,
    };

    this.socket.emit('rideRequest', requestPayload);
    alert('Ride requested');
  }

  cancelRide() {
    this.socket.emit('cancelRide');
    alert('Ride canceled');
  }

  searchDestination() {
    if (this.destination && this.geocoder) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: this.destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], { icon: this.getRandomCustomerIcon() }).addTo(this.map).bindPopup('Customer');

          this.driverMarkers.forEach((driverMarker) => {
            this.map.removeLayer(driverMarker);
          });
          this.driverMarkers = [];

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map(driver => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          }).addTo(this.map).bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline([[center.lat(), center.lng()], [nearestDriver.lat, nearestDriver.lng]], { color: 'red' }).addTo(this.map);

          const requestPayload = {
            destination: this.destination,
            customer: this.customerName,
          };

          this.socket.emit('rideRequest', requestPayload);
          alert('Ride requested');
        }
      });
    }
  }

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map(this.mapContainer.nativeElement).setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.geocoder = new google.maps.Geocoder();
  }

  getDriverLocation(center: any, distance: number) {
    const latDistance = distance * 0.009;
    const lngDistance = (distance * 0.009) / Math.cos((Math.PI / 180) * center.lat());

    const lat = center.lat() + latDistance * (Math.random() < 0.5 ? -1 : 1);
    const lng = center.lng() + lngDistance * (Math.random() < 0.5 ? -1 : 1);

    return { lat, lng };
  }

  getNearestDriver(center: any, driverLocations: any[]) {
    let nearestDriver = driverLocations[0];
    let nearestDistance = this.calculateDistance(center, nearestDriver);

    for (let i = 1; i < driverLocations.length; i++) {
      const distance = this.calculateDistance(center, driverLocations[i]);
      if (distance < nearestDistance) {
        nearestDriver = driverLocations[i];
        nearestDistance = distance;
      }
    }

    return nearestDriver;
  }

  calculateDistance(point1: any, point2: any) {
    const latDiff = Math.abs(point1.lat() - point2.lat);
    const lngDiff = Math.abs(point1.lng() - point2.lng);

    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  getRandomDriverIcon() {
    return L.divIcon({
      html: '<i class="fas fa-truck fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  getRandomCustomerIcon() {
    return L.divIcon({
      html: '<i class="fas fa-user fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  initializeWebSocket() {
    const socketUrl = 'http://localhost:3000'; // Replace with your backend URL
    this.socket = io(socketUrl) as Socket; // Use the io object to establish the socket connection

    this.socket.on('ride_accepted', (rideDetails: any) => {
      this.currentRide = rideDetails;
      this.rideAccepted = true;
      this.rideRejected = false;
      alert('Ride accepted by ' + this.currentRide.driver);
    });

    this.socket.on('ride_rejected', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      this.rideRejected = true;
      alert('No drivers available');
    });

    this.socket.on('ride_canceled', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      this.rideRejected = false;
      alert('Ride canceled');
    });
  }

  submitRating() {
    this.socket.emit('customerRatingUpdate', this.rating);
    alert('Rating submitted');
  }
}

*/

/*import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { RequestService } from '../services/request.service';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css'],
})
export class CustomerComponent implements OnInit {
  destination: string = '';
  customerName: string = '';
  currentRide: any;
  rideAccepted: boolean = false;
  rideRejected: boolean = false;
  rating: number = 0;
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  geocoder: any = null;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private driverService: DriverService
  ) {}

  ngOnInit() {
    this.customerName = this.driverService.getDriverName();
    this.currentRide = null;
    this.initMap();
    this.initializeWebSocket();
  }

  logout() {
    alert('Logged out');
    this.router.navigate(['/']);
  }

  requestRide() {
    const requestPayload = {
      destination: this.destination,
      customer: this.customerName,
    };

    this.socket.emit('rideRequest', requestPayload);
    alert('Ride requested');
  }

  cancelRide() {
    this.socket.emit('cancelRide');
    alert('Ride canceled');
  }

  searchDestination() {
    if (this.destination && this.geocoder) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: this.destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], { icon: this.getRandomCustomerIcon() }).addTo(this.map).bindPopup('Customer');

          this.driverMarkers.forEach((driverMarker) => {
            this.map.removeLayer(driverMarker);
          });
          this.driverMarkers = [];

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map(driver => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          }).addTo(this.map).bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline([[center.lat(), center.lng()], [nearestDriver.lat, nearestDriver.lng]], { color: 'red' }).addTo(this.map);

          const requestPayload = {
            destination: this.destination,
            customer: this.customerName,
            driver: this.nearestDriverMarker.getPopup().getContent()
          };

          this.socket.emit('rideRequest', requestPayload);
          alert('Ride requested');
        }
      });
    }
  }

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map(this.mapContainer.nativeElement).setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.geocoder = new google.maps.Geocoder();
  }

  getDriverLocation(center: any, distance: number) {
    const latDistance = distance * 0.009;
    const lngDistance = (distance * 0.009) / Math.cos((Math.PI / 180) * center.lat());

    const lat = center.lat() + latDistance * (Math.random() < 0.5 ? -1 : 1);
    const lng = center.lng() + lngDistance * (Math.random() < 0.5 ? -1 : 1);

    return { lat, lng };
  }

  getNearestDriver(center: any, driverLocations: any[]) {
    let nearestDriver = driverLocations[0];
    let nearestDistance = this.calculateDistance(center, nearestDriver);

    for (let i = 1; i < driverLocations.length; i++) {
      const distance = this.calculateDistance(center, driverLocations[i]);
      if (distance < nearestDistance) {
        nearestDriver = driverLocations[i];
        nearestDistance = distance;
      }
    }

    return nearestDriver;
  }

  calculateDistance(point1: any, point2: any) {
    const latDiff = Math.abs(point1.lat() - point2.lat);
    const lngDiff = Math.abs(point1.lng() - point2.lng);

    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  getRandomDriverIcon() {
    return L.divIcon({
      html: '<i class="fas fa-truck fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  getRandomCustomerIcon() {
    return L.divIcon({
      html: '<i class="fas fa-user fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  initializeWebSocket() {
    const socketUrl = 'http://localhost:3000'; // Replace with your backend URL
    this.socket = io(socketUrl) as Socket; // Use the io object to establish the socket connection

    this.socket.on('ride_accepted', (rideDetails: any) => {
      this.currentRide = rideDetails;
      this.rideAccepted = true;
      this.rideRejected = false;
      alert('Ride accepted by ' + this.currentRide.driver);
    });

    this.socket.on('ride_rejected', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      this.rideRejected = true;
      alert('No drivers available');
    });

    this.socket.on('ride_canceled', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      this.rideRejected = false;
      alert('Ride canceled');
    });
  }

  submitRating() {
    this.socket.emit('customerRatingUpdate', this.rating);
    alert('Rating submitted');
  }
}
*/


/*import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { RequestService } from '../services/request.service';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css'],
})
export class CustomerComponent implements OnInit {
  destination: string = '';
  customerName: string = '';
  currentRide: any;
  rideAccepted: boolean = false;
  rideRejected: boolean = false;
  rating: number = 0;
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  geocoder: any = null;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private driverService: DriverService
  ) {}

  ngOnInit() {
    this.customerName = this.driverService.getDriverName();
    this.currentRide = null;
    this.initMap();
    this.initializeWebSocket();
  }

  logout() {
    alert('Logged out');
    this.router.navigate(['/']);
  }

  requestRide() {
    const requestPayload = {
      destination: this.destination,
      customer: this.customerName,
    };

    this.socket.emit('rideRequest', requestPayload);
    alert('Ride requested');
  }

  cancelRide() {
    this.socket.emit('cancelRide');
    alert('Ride canceled');
  }

  searchDestination() {
    if (this.destination && this.geocoder) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: this.destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], { icon: this.getRandomCustomerIcon() }).addTo(this.map).bindPopup('Customer');

          this.driverMarkers.forEach((driverMarker) => {
            this.map.removeLayer(driverMarker);
          });
          this.driverMarkers = [];

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map(driver => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          }).addTo(this.map).bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline([[center.lat(), center.lng()], [nearestDriver.lat, nearestDriver.lng]], { color: 'red' }).addTo(this.map);
        }
      });
    }
  }

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map(this.mapContainer.nativeElement).setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.geocoder = new google.maps.Geocoder();
  }

  getDriverLocation(center: any, distance: number) {
    const latDistance = distance * 0.009;
    const lngDistance = (distance * 0.009) / Math.cos((Math.PI / 180) * center.lat());

    const lat = center.lat() + latDistance * (Math.random() < 0.5 ? -1 : 1);
    const lng = center.lng() + lngDistance * (Math.random() < 0.5 ? -1 : 1);

    return { lat, lng };
  }

  getNearestDriver(center: any, driverLocations: any[]) {
    let nearestDriver = driverLocations[0];
    let nearestDistance = this.calculateDistance(center, nearestDriver);

    for (let i = 1; i < driverLocations.length; i++) {
      const distance = this.calculateDistance(center, driverLocations[i]);
      if (distance < nearestDistance) {
        nearestDriver = driverLocations[i];
        nearestDistance = distance;
      }
    }

    return nearestDriver;
  }

  calculateDistance(point1: any, point2: any) {
    const latDiff = Math.abs(point1.lat() - point2.lat);
    const lngDiff = Math.abs(point1.lng() - point2.lng);

    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  getRandomDriverIcon() {
    return L.divIcon({
      html: '<i class="fas fa-truck fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  getRandomCustomerIcon() {
    return L.divIcon({
      html: '<i class="fas fa-user fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  initializeWebSocket() {
    const socketUrl = 'http://localhost:3000'; // Replace with your backend URL
    this.socket = io(socketUrl) as Socket; // Use the io object to establish the socket connection

    this.socket.on('ride_accepted', (rideDetails: any) => {
      this.currentRide = rideDetails;
      this.rideAccepted = true;
      this.rideRejected = false;
      alert('Ride accepted by ' + this.currentRide.driver);
    });

    this.socket.on('ride_rejected', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      this.rideRejected = true;
      alert('No drivers available');
    });

    this.socket.on('ride_canceled', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      this.rideRejected = false;
      alert('Ride canceled');
    });
  }

  submitRating() {
    this.socket.emit('customerRatingUpdate', this.rating);
    alert('Rating submitted');
  }
}
*/

/*import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { RequestService } from '../services/request.service';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css'],
})
export class CustomerComponent implements OnInit {
  destination: string = '';
  customerName: string = '';
  currentRide: any;
  rideAccepted: boolean = false;
  rideRejected: boolean = false;
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  geocoder: any = null;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(
    private router: Router,
    private requestService: RequestService,
    private driverService: DriverService
  ) {}

  ngOnInit() {
    this.customerName = 'John Doe';
    this.currentRide = null;
    this.initMap();
    this.initializeWebSocket();
  }

  logout() {
    alert('Logged out');
    this.router.navigate(['/']);
  }

  requestRide() {
    const requestPayload = {
      destination: this.destination,
      customer: this.customerName,
    };

    this.socket.emit('rideRequest', requestPayload);
    alert('Ride requested');
  }

  cancelRide() {
    this.socket.emit('cancelRide');
    alert('Ride canceled');
  }

  searchDestination() {
    if (this.destination && this.geocoder) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: this.destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], { icon: this.getRandomCustomerIcon() }).addTo(this.map).bindPopup('Customer');

          this.driverMarkers.forEach((driverMarker) => {
            this.map.removeLayer(driverMarker);
          });
          this.driverMarkers = [];

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map(driver => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          }).addTo(this.map).bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline([[center.lat(), center.lng()], [nearestDriver.lat, nearestDriver.lng]], { color: 'red' }).addTo(this.map);
        }
      });
    }
  }

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map(this.mapContainer.nativeElement).setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.geocoder = new google.maps.Geocoder();
  }

  getDriverLocation(center: any, distance: number) {
    const latDistance = distance * 0.009;
    const lngDistance = (distance * 0.009) / Math.cos((Math.PI / 180) * center.lat());

    const lat = center.lat() + latDistance * (Math.random() < 0.5 ? -1 : 1);
    const lng = center.lng() + lngDistance * (Math.random() < 0.5 ? -1 : 1);

    return { lat, lng };
  }

  getNearestDriver(center: any, driverLocations: any[]) {
    let nearestDriver = driverLocations[0];
    let nearestDistance = this.calculateDistance(center, nearestDriver);

    for (let i = 1; i < driverLocations.length; i++) {
      const distance = this.calculateDistance(center, driverLocations[i]);
      if (distance < nearestDistance) {
        nearestDriver = driverLocations[i];
        nearestDistance = distance;
      }
    }

    return nearestDriver;
  }

  calculateDistance(point1: any, point2: any) {
    const latDiff = Math.abs(point1.lat() - point2.lat);
    const lngDiff = Math.abs(point1.lng() - point2.lng);

    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  getRandomDriverIcon() {
    return L.divIcon({
      html: '<i class="fas fa-truck fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  getRandomCustomerIcon() {
    return L.divIcon({
      html: '<i class="fas fa-user fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  initializeWebSocket() {
    const socketUrl = 'http://localhost:3000'; // Replace with your backend URL
    this.socket = io(socketUrl) as Socket; // Use the io object to establish the socket connection

    this.socket.on('rideAccepted', (rideDetails: any) => {
      this.currentRide = rideDetails;
      this.rideAccepted = true;
      this.rideRejected = false;
      alert('Ride accepted by ' + this.currentRide.driver);
    });

    this.socket.on('rideRejected', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      this.rideRejected = true;
      alert('No drivers available');
    });

    this.socket.on('rideCanceled', () => {
      this.currentRide = null;
      this.rideAccepted = false;
      this.rideRejected = false;
      alert('Ride canceled');
    });
  }
}
*/

/*
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { RequestService } from '../services/request.service';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';

declare var google: any;

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css'],
})
export class CustomerComponent implements OnInit {
  destination: string = '';
  customerName: string = '';
  currentRide: any;
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  geocoder: any = null;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: WebSocket; // Add the definite assignment assertion (!) after the property declaration


  constructor(
    private router: Router,
    private requestService: RequestService,
    private driverService: DriverService
  ) {}

  ngOnInit() {
    this.customerName = 'John Doe';
    this.currentRide = null;
    this.initMap();
  }

  logout() {
    alert('Logged out');
    this.router.navigate(['/']);
  }

  requestRide() {
    const requestPayload = {
      destination: this.destination,
      customer: this.customerName,
    };

    this.socket.send(JSON.stringify(requestPayload));
    alert('Ride requested');
  }

  cancelRide() {
    this.socket.send(JSON.stringify({ action: 'cancel' }));
    alert('Ride canceled');
  }

  searchDestination() {
    if (this.destination && this.geocoder) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: this.destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], { icon: this.getRandomCustomerIcon() }).addTo(this.map).bindPopup('Customer');

          this.driverMarkers.forEach((driverMarker) => {
            this.map.removeLayer(driverMarker);
          });
          this.driverMarkers = [];

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map(driver => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          }).addTo(this.map).bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline([[center.lat(), center.lng()], [nearestDriver.lat, nearestDriver.lng]], { color: 'red' }).addTo(this.map);
        }
      });
    }
  }

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map(this.mapContainer.nativeElement).setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.geocoder = new google.maps.Geocoder();
  }

  getDriverLocation(center: any, distance: number) {
    const latDistance = distance * 0.009;
    const lngDistance = (distance * 0.009) / Math.cos((Math.PI / 180) * center.lat());

    const lat = center.lat() + latDistance * (Math.random() < 0.5 ? -1 : 1);
    const lng = center.lng() + lngDistance * (Math.random() < 0.5 ? -1 : 1);

    return { lat, lng };
  }

  getNearestDriver(center: any, driverLocations: any[]) {
    let nearestDriver = driverLocations[0];
    let nearestDistance = this.calculateDistance(center, nearestDriver);

    for (let i = 1; i < driverLocations.length; i++) {
      const distance = this.calculateDistance(center, driverLocations[i]);
      if (distance < nearestDistance) {
        nearestDriver = driverLocations[i];
        nearestDistance = distance;
      }
    }

    return nearestDriver;
  }

  calculateDistance(point1: any, point2: any) {
    const latDiff = Math.abs(point1.lat() - point2.lat);
    const lngDiff = Math.abs(point1.lng() - point2.lng);

    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  getRandomDriverIcon() {
    return L.divIcon({
      html: '<i class="fas fa-truck fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  getRandomCustomerIcon() {
    return L.divIcon({
      html: '<i class="fas fa-user fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }
  initializeWebSocket() {
    const socketUrl = 'ws://localhost:3000'; // Replace with your WebSocket server URL
    this.socket = new WebSocket(socketUrl);

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.action === 'ride_accepted') {
        // Handle ride acceptance
        this.currentRide = message.data;
        alert('Ride accepted by ' + this.currentRide.driver);
      }
    };

    this.socket.onclose = () => {
      console.log('Disconnected from the WebSocket server');
    };
  }
}


/
    this.geocoder = new google.maps.Geocoder();
  }

  getDriverLocation(center: any, distance: number) {
    const latDistance = distance * 0.009;
    const lngDistance = (distance * 0.009) / Math.cos((Math.PI / 180) * center.lat());

    const lat = center.lat() + latDistance * (Math.random() < 0.5 ? -1 : 1);
    const lng = center.lng() + lngDistance * (Math.random() < 0.5 ? -1 : 1);

    return { lat, lng };
  }

  getNearestDriver(center: any, driverLocations: any[]) {
    let nearestDriver = driverLocations[0];
    let nearestDistance = this.calculateDistance(center, nearestDriver);

    for (let i = 1; i < driverLocations.length; i++) {
      const distance = this.calculateDistance(center, driverLocations[i]);
      if (distance < nearestDistance) {
        nearestDriver = driverLocations[i];
        nearestDistance = distance;
      }
    }

    return nearestDriver;
  }

  calculateDistance(point1: any, point2: any) {
    const latDiff = Math.abs(point1.lat() - point2.lat);
    const lngDiff = Math.abs(point1.lng() - point2.lng);

    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  }

  getRandomDriverIcon() {
    return L.divIcon({
      html: '<i class="fas fa-truck fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }

  getRandomCustomerIcon() {
    return L.divIcon({
      html: '<i class="fas fa-user fa-2x"></i>', // Increase the icon size to 2x
      iconSize: [40, 40], // Adjust the icon size as needed
      iconAnchor: [20, 40], // Adjust the icon anchor as needed
    });
  }
*/