import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';



declare var google: any;

@Component({
  selector: 'app-driver',
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.css'],
})
export class DriverComponent implements OnInit {
  driverName: string = 'Morgy cloudd';
  driverId: string = 'DR1234';
  driverRating: number = 4.5;
  totalEarnings: number = 1500;
  completedTrips: number = 50;
  isAvailable: boolean = true;
  activeTrip: any;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(private router: Router, private driverService: DriverService) {}

  ngOnInit() {
    this.driverName = this.driverService.getDriverName();
    this.initMap();
    this.initializeWebSocket();
    this.updateDriverLocation();
  }

  toggleAvailability() {
    this.isAvailable = !this.isAvailable;
    this.socket.emit('toggleAvailability', this.isAvailable);
  }

  completeTrip() {
    this.socket.emit('completeTrip');
    this.activeTrip = null;
  }

  logout() {
    // Implement your logout logic here
    this.router.navigate(['/']); // Redirect to the home page
  }

  acceptRide() {
    this.socket.emit('rideAccepted', this.activeTrip); // Send the entire ride details to the server
  }

  rejectRide() {
    // Implement ride rejection logic here
    this.socket.emit('rideRejected', this.activeTrip.customer); // Send rejection notification to the server
  }


  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map('map').setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const searchButton = document.getElementById('search-button') as HTMLButtonElement;

    searchButton.addEventListener('click', () => {
      const destination = searchInput.value;
      this.searchDestination(destination);
    });
  }

  updateDriverLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position: GeolocationPosition) => {
          const { latitude, longitude } = position.coords;
          const driverLatLng = L.latLng(latitude, longitude);

          if (this.driverMarkers.length === 0) {
            this.driverMarkers.push(
              L.marker(driverLatLng, { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup('You are here')
            );
          } else {
            this.driverMarkers[0].setLatLng(driverLatLng);
          }

          this.map.panTo(driverLatLng);

          if (this.activeTrip) {
            const destinationLatLng = L.latLng(this.activeTrip.destination.lat, this.activeTrip.destination.lng);
            if (this.polyline) {
              this.map.removeLayer(this.polyline);
            }

            this.polyline = L.polyline(
              [
                [driverLatLng.lat, driverLatLng.lng],
                [destinationLatLng.lat, destinationLatLng.lng],
              ],
              { color: 'blue' }
            ).addTo(this.map);
          }
        },
        (error: GeolocationPositionError) => {
          console.error('Error getting driver location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  searchDestination(destination: string) {
    if (destination && google && this.map) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], {
            icon: this.getRandomCustomerIcon(),
          })
            .addTo(this.map)
            .bindPopup('Customer');

          if (this.driverMarkers.length > 0) {
            this.driverMarkers.forEach((marker) => this.map.removeLayer(marker));
            this.driverMarkers = [];
          }

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], {
              icon: this.getRandomDriverIcon(),
            })
              .addTo(this.map)
              .bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map((driver) => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          })
            .addTo(this.map)
            .bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline(
            [
              [center.lat(), center.lng()],
              [nearestDriver.lat, nearestDriver.lng],
            ],
            { color: 'red' }
          ).addTo(this.map);
        }
      });
    }
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
    
    /*initializeWebSocket() {
      const socketUrl = '/socket'; // Use the proxy path
      this.socket = io(socketUrl) as Socket; // Use the io object to establish the socket connection
*/
    this.socket.on('ride_request', (rideDetails: any) => {
      console.log('Ride requested:', rideDetails);
      this.activeTrip = rideDetails;
    });

    this.socket.on('ride_accepted', (message: string) => {
      alert('Ride accepted: ' + message);
      // Send a message back to the customer
      const rideAcceptedMessage = 'Your ride has been accepted by ' + this.driverName;
      this.socket.emit('rideAccepted', rideAcceptedMessage);
    });

    this.socket.on('ride_rejected', (message: string) => {
      alert('Ride rejected: ' + message);
      // Send a message back to the customer
      const rideRejectedMessage = 'Your ride has been rejected by ' + this.driverName;
      this.socket.emit('rideRejected', rideRejectedMessage);
    });

    this.socket.on('ride_canceled', () => {
      console.log('Ride canceled');
      alert('Ride canceled');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from the WebSocket server');
    });
  }
}


/*
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-driver',
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.css'],
})
export class DriverComponent implements OnInit {
  driverName: string = 'Morgy cloudd';
  driverId: string = 'DR1234';
  driverRating: number = 4.5;
  totalEarnings: number = 1500;
  completedTrips: number = 50;
  isAvailable: boolean = true;
  activeTrip: any;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(private router: Router, private driverService: DriverService) {}

  ngOnInit() {
    this.driverName = this.driverService.getDriverName();
    this.initMap();
    this.initializeWebSocket();
    this.updateDriverLocation();
  }

  toggleAvailability() {
    this.isAvailable = !this.isAvailable;
    this.socket.emit('toggleAvailability', this.isAvailable);
  }

  completeTrip() {
    this.socket.emit('completeTrip');
    this.activeTrip = null;
  }

  logout() {
    // Implement your logout logic here
    this.router.navigate(['/']); // Redirect to the home page
  }

  acceptRide() {
    this.socket.emit('rideAccepted', this.activeTrip); // Send the entire ride details to the backend
  }

  rejectRide() {
    // Implement ride rejection logic here
    this.socket.emit('rideRejected', this.activeTrip.customerId); // Send rejection notification to the backend
  }

  // Rest of the component code...

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map('map').setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const searchButton = document.getElementById('search-button') as HTMLButtonElement;

    searchButton.addEventListener('click', () => {
      const destination = searchInput.value;
      this.searchDestination(destination);
    });
  }

  updateDriverLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position: GeolocationPosition) => {
          const { latitude, longitude } = position.coords;
          const driverLatLng = L.latLng(latitude, longitude);

          if (this.driverMarkers.length === 0) {
            this.driverMarkers.push(
              L.marker(driverLatLng, { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup('You are here')
            );
          } else {
            this.driverMarkers[0].setLatLng(driverLatLng);
          }

          this.map.panTo(driverLatLng);

          if (this.activeTrip) {
            const destinationLatLng = L.latLng(this.activeTrip.destination.lat, this.activeTrip.destination.lng);
            if (this.polyline) {
              this.map.removeLayer(this.polyline);
            }

            this.polyline = L.polyline(
              [
                [driverLatLng.lat, driverLatLng.lng],
                [destinationLatLng.lat, destinationLatLng.lng],
              ],
              { color: 'blue' }
            ).addTo(this.map);
          }
        },
        (error: GeolocationPositionError) => {
          console.error('Error getting driver location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  searchDestination(destination: string) {
    if (destination && google && this.map) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], {
            icon: this.getRandomCustomerIcon(),
          })
            .addTo(this.map)
            .bindPopup('Customer');

          if (this.driverMarkers.length > 0) {
            this.driverMarkers.forEach((marker) => this.map.removeLayer(marker));
            this.driverMarkers = [];
          }

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], {
              icon: this.getRandomDriverIcon(),
            })
              .addTo(this.map)
              .bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map((driver) => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          })
            .addTo(this.map)
            .bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline(
            [
              [center.lat(), center.lng()],
              [nearestDriver.lat, nearestDriver.lng],
            ],
            { color: 'red' }
          ).addTo(this.map);
        }
      });
    }
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

    this.socket.on('ride_request', (rideDetails: any) => {
      this.activeTrip = rideDetails;
    });

    this.socket.on('driverAvailabilityUpdated', (isAvailable: boolean) => {
      this.isAvailable = isAvailable;
    });

    this.socket.on('driverRatingUpdated', (rating: number) => {
      this.driverRating = rating;
    });

    this.socket.on('ride_accepted', (message: string) => {
      alert('Ride accepted: ' + message);
      // Send a message back to the customer
      const rideAcceptedMessage = 'Your ride has been accepted by ' + this.driverName;
      this.socket.emit('rideAccepted', rideAcceptedMessage);
    });

    this.socket.on('ride_rejected', (message: string) => {
      alert('Ride rejected: ' + message);
      // Send a message back to the customer
      const rideRejectedMessage = 'Your ride has been rejected by ' + this.driverName;
      this.socket.emit('rideRejected', rideRejectedMessage);
    });

    this.socket.on('ride_canceled', () => {
      alert('Ride canceled');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from the WebSocket server');
    });
  }
}
*/
/*import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';


declare var google: any;

@Component({
  selector: 'app-driver',
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.css'],
})
export class DriverComponent implements OnInit {
  driverName: string = 'Morgy cloudd';
  driverId: string = 'DR1234';
  driverRating: number = 4.5;
  totalEarnings: number = 1500;
  completedTrips: number = 50;
  isAvailable: boolean = true;
  activeTrip: any;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(private router: Router, private driverService: DriverService) {}

  ngOnInit() {
    this.driverName = this.driverService.getDriverName();
    this.initMap();
    this.initializeWebSocket();
    this.updateDriverLocation();
  }

  toggleAvailability() {
    this.isAvailable = !this.isAvailable;
    this.socket.emit('toggleAvailability', this.isAvailable);
  }

  completeTrip() {
    this.socket.emit('completeTrip');
    this.activeTrip = null;
  }

  logout() {
    // Implement your logout logic here
    this.router.navigate(['/']); // Redirect to the home page
  }

  acceptRide() {
    this.socket.emit('rideAccepted', this.activeTrip); // Send the entire ride details to the backend
  }

  rejectRide() {
    // Implement ride rejection logic here
    this.socket.emit('rideRejected', this.activeTrip.customerId); // Send rejection notification to the backend
  }

  // Rest of the component code...

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map('map').setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const searchButton = document.getElementById('search-button') as HTMLButtonElement;

    searchButton.addEventListener('click', () => {
      const destination = searchInput.value;
      this.searchDestination(destination);
    });
  }

  updateDriverLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position: GeolocationPosition) => {
          const { latitude, longitude } = position.coords;
          const driverLatLng = L.latLng(latitude, longitude);

          if (this.driverMarkers.length === 0) {
            this.driverMarkers.push(
              L.marker(driverLatLng, { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup('You are here')
            );
          } else {
            this.driverMarkers[0].setLatLng(driverLatLng);
          }

          this.map.panTo(driverLatLng);

          if (this.activeTrip) {
            const destinationLatLng = L.latLng(this.activeTrip.destination.lat, this.activeTrip.destination.lng);
            if (this.polyline) {
              this.map.removeLayer(this.polyline);
            }

            this.polyline = L.polyline(
              [
                [driverLatLng.lat, driverLatLng.lng],
                [destinationLatLng.lat, destinationLatLng.lng],
              ],
              { color: 'blue' }
            ).addTo(this.map);
          }
        },
        (error: GeolocationPositionError) => {
          console.error('Error getting driver location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  searchDestination(destination: string) {
    if (destination && google && this.map) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], {
            icon: this.getRandomCustomerIcon(),
          })
            .addTo(this.map)
            .bindPopup('Customer');

          if (this.driverMarkers.length > 0) {
            this.driverMarkers.forEach((marker) => this.map.removeLayer(marker));
            this.driverMarkers = [];
          }

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], {
              icon: this.getRandomDriverIcon(),
            })
              .addTo(this.map)
              .bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map((driver) => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          })
            .addTo(this.map)
            .bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline(
            [
              [center.lat(), center.lng()],
              [nearestDriver.lat, nearestDriver.lng],
            ],
            { color: 'red' }
          ).addTo(this.map);
        }
      });
    }
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

    this.socket.on('ride_request', (rideDetails: any) => {
      this.activeTrip = rideDetails;
    });

    this.socket.on('driverAvailabilityUpdated', (isAvailable: boolean) => {
      this.isAvailable = isAvailable;
    });

    this.socket.on('driverRatingUpdated', (rating: number) => {
      this.driverRating = rating;
    });

    this.socket.on('ride_accepted', (message: string) => {
      alert('Ride accepted: ' + message);
      // Send a message back to the customer
      const rideAcceptedMessage = 'Your ride has been accepted by ' + this.driverName;
      this.socket.emit('rideAccepted', rideAcceptedMessage);
    });

    this.socket.on('ride_rejected', (message: string) => {
      alert('Ride rejected: ' + message);
      // Send a message back to the customer
      const rideRejectedMessage = 'Your ride has been rejected by ' + this.driverName;
      this.socket.emit('rideRejected', rideRejectedMessage);
    });

    this.socket.on('ride_canceled', () => {
      alert('Ride canceled');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from the WebSocket server');
    });
  }
}
*/
/*import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-driver',
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.css'],
})
export class DriverComponent implements OnInit {
  driverName: string = '';
  driverId: string = 'DR1234';
  driverRating: number = 4.5;
  totalEarnings: number = 1500;
  completedTrips: number = 50;
  isAvailable: boolean = true;
  activeTrip: any;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(private router: Router, private driverService: DriverService) {}

  ngOnInit() {
    this.driverName = this.driverService.getDriverName();
    this.initMap();
    this.initializeWebSocket();
    this.updateDriverLocation();
  }

  toggleAvailability() {
    this.isAvailable = !this.isAvailable;
    this.socket.emit('toggleAvailability', this.isAvailable);
  }

  completeTrip() {
    this.socket.emit('completeTrip');
    this.activeTrip = null;
  }

  logout() {
    // Implement your logout logic here
    this.router.navigate(['/']); // Redirect to the home page
  }

  acceptRide() {
    // Implement ride acceptance logic here
    this.socket.emit('rideAccepted', {
      customerId: this.activeTrip.customerId,
      phoneNumber: '0720872002'
    }); // Send acceptance notification to the backend
  }

  rejectRide() {
    // Implement ride rejection logic here
    this.socket.emit('rideRejected', this.activeTrip.customerId); // Send rejection notification to the backend
  }

  // Rest of the component code...

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map('map').setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const searchButton = document.getElementById('search-button') as HTMLButtonElement;

    searchButton.addEventListener('click', () => {
      const destination = searchInput.value;
      this.searchDestination(destination);
    });
  }

  updateDriverLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position: GeolocationPosition) => {
          const { latitude, longitude } = position.coords;
          const driverLatLng = L.latLng(latitude, longitude);

          if (this.driverMarkers.length === 0) {
            this.driverMarkers.push(
              L.marker(driverLatLng, { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup('You are here')
            );
          } else {
            this.driverMarkers[0].setLatLng(driverLatLng);
          }

          this.map.panTo(driverLatLng);

          if (this.activeTrip) {
            const destinationLatLng = L.latLng(this.activeTrip.destination.lat, this.activeTrip.destination.lng);
            if (this.polyline) {
              this.map.removeLayer(this.polyline);
            }

            this.polyline = L.polyline(
              [
                [driverLatLng.lat, driverLatLng.lng],
                [destinationLatLng.lat, destinationLatLng.lng],
              ],
              { color: 'blue' }
            ).addTo(this.map);
          }
        },
        (error: GeolocationPositionError) => {
          console.error('Error getting driver location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  searchDestination(destination: string) {
    if (destination && google && this.map) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], {
            icon: this.getRandomCustomerIcon(),
          })
            .addTo(this.map)
            .bindPopup('Customer');

          if (this.driverMarkers.length > 0) {
            this.driverMarkers.forEach((marker) => this.map.removeLayer(marker));
            this.driverMarkers = [];
          }

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], {
              icon: this.getRandomDriverIcon(),
            })
              .addTo(this.map)
              .bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map((driver) => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          })
            .addTo(this.map)
            .bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline(
            [
              [center.lat(), center.lng()],
              [nearestDriver.lat, nearestDriver.lng],
            ],
            { color: 'red' }
          ).addTo(this.map);
        }
      });
    }
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

    this.socket.on('ride_request', (rideDetails: any) => {
      this.activeTrip = rideDetails;
    });

    this.socket.on('driverAvailabilityUpdated', (isAvailable: boolean) => {
      this.isAvailable = isAvailable;
    });

    this.socket.on('driverRatingUpdated', (rating: number) => {
      this.driverRating = rating;
    });

    this.socket.on('ride_accepted', (message: string) => {
      alert('Ride accepted: ' + message);
      // Send a message back to the customer
      const rideAcceptedMessage = 'Your ride has been accepted by ' + this.driverName;
      this.socket.emit('rideAccepted', rideAcceptedMessage);
    });

    this.socket.on('ride_rejected', (message: string) => {
      alert('Ride rejected: ' + message);
      // Send a message back to the customer
      const rideRejectedMessage = 'Your ride has been rejected by ' + this.driverName;
      this.socket.emit('rideRejected', rideRejectedMessage);
    });

    this.socket.on('ride_canceled', () => {
      alert('Ride canceled');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from the WebSocket server');
    });
  }
}
*/



/*import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-driver',
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.css'],
})
export class DriverComponent implements OnInit {
  driverName: string = 'Morgy cloudd';
  driverId: string = 'DR1234';
  driverRating: number = 4.5;
  totalEarnings: number = 1500;
  completedTrips: number = 50;
  isAvailable: boolean = true;
  activeTrip: any;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(private router: Router, private driverService: DriverService) {}

  ngOnInit() {
    this.driverName = this.driverService.getDriverName();
    this.initMap();
    this.initializeWebSocket();
    this.updateDriverLocation();
  }

  toggleAvailability() {
    this.isAvailable = !this.isAvailable;
    this.socket.emit('toggleAvailability', this.isAvailable);
  }

  completeTrip() {
    this.socket.emit('completeTrip');
    this.activeTrip = null;
  }

  logout() {
    // Implement your logout logic here
    this.router.navigate(['/']); // Redirect to the home page
  }

  acceptRide() {
    // Implement ride acceptance logic here
    this.socket.emit('rideAccepted', this.activeTrip.customerId); // Send acceptance notification to the backend
  }

  rejectRide() {
    // Implement ride rejection logic here
    this.socket.emit('rideRejected', this.activeTrip.customerId); // Send rejection notification to the backend
  }

  // Rest of the component code...

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map('map').setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const searchButton = document.getElementById('search-button') as HTMLButtonElement;

    searchButton.addEventListener('click', () => {
      const destination = searchInput.value;
      this.searchDestination(destination);
    });
  }

  updateDriverLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position: GeolocationPosition) => {
          const { latitude, longitude } = position.coords;
          const driverLatLng = L.latLng(latitude, longitude);

          if (this.driverMarkers.length === 0) {
            this.driverMarkers.push(
              L.marker(driverLatLng, { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup('You are here')
            );
          } else {
            this.driverMarkers[0].setLatLng(driverLatLng);
          }

          this.map.panTo(driverLatLng);

          if (this.activeTrip) {
            const destinationLatLng = L.latLng(this.activeTrip.destination.lat, this.activeTrip.destination.lng);
            if (this.polyline) {
              this.map.removeLayer(this.polyline);
            }

            this.polyline = L.polyline(
              [
                [driverLatLng.lat, driverLatLng.lng],
                [destinationLatLng.lat, destinationLatLng.lng],
              ],
              { color: 'blue' }
            ).addTo(this.map);
          }
        },
        (error: GeolocationPositionError) => {
          console.error('Error getting driver location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  searchDestination(destination: string) {
    if (destination && google && this.map) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], {
            icon: this.getRandomCustomerIcon(),
          })
            .addTo(this.map)
            .bindPopup('Customer');

          if (this.driverMarkers.length > 0) {
            this.driverMarkers.forEach((marker) => this.map.removeLayer(marker));
            this.driverMarkers = [];
          }

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], {
              icon: this.getRandomDriverIcon(),
            })
              .addTo(this.map)
              .bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map((driver) => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          })
            .addTo(this.map)
            .bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline(
            [
              [center.lat(), center.lng()],
              [nearestDriver.lat, nearestDriver.lng],
            ],
            { color: 'red' }
          ).addTo(this.map);
        }
      });
    }
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

    this.socket.on('ride_request', (rideDetails: any) => {
      this.activeTrip = rideDetails;
    });

    this.socket.on('driverAvailabilityUpdated', (isAvailable: boolean) => {
      this.isAvailable = isAvailable;
    });

    this.socket.on('driverRatingUpdated', (rating: number) => {
      this.driverRating = rating;
    });

    this.socket.on('ride_accepted', (message: string) => {
      alert('Ride accepted: ' + message);
      // Send a message back to the customer
      const rideAcceptedMessage = 'Your ride has been accepted by ' + this.driverName;
      this.socket.emit('rideAccepted', rideAcceptedMessage);
    });

    this.socket.on('ride_rejected', (message: string) => {
      alert('Ride rejected: ' + message);
      // Send a message back to the customer
      const rideRejectedMessage = 'Your ride has been rejected by ' + this.driverName;
      this.socket.emit('rideRejected', rideRejectedMessage);
    });

    this.socket.on('ride_canceled', () => {
      alert('Ride canceled');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from the WebSocket server');
    });
  }
}
*/

/*
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-driver',
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.css'],
})
export class DriverComponent implements OnInit {
  driverName: string = '';
  driverId: string = 'DR1234';
  driverRating: number = 4.5;
  totalEarnings: number = 1500;
  completedTrips: number = 50;
  isAvailable: boolean = true;
  activeTrip: any;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(private router: Router, private driverService: DriverService) {}

  ngOnInit() {
    this.driverName = this.driverService.getDriverName();
    this.initMap();
    this.initializeWebSocket();
    this.updateDriverLocation();
  }

  toggleAvailability() {
    this.isAvailable = !this.isAvailable;
    this.socket.emit('toggleAvailability', this.isAvailable);
  }

  completeTrip() {
    this.socket.emit('completeTrip');
    this.activeTrip = null;
  }

  logout() {
    // Implement your logout logic here
    this.router.navigate(['/']); // Redirect to the home page
  }

  acceptRide() {
    // Implement ride acceptance logic here
    this.socket.emit('rideAccepted', this.activeTrip.customerId); // Send acceptance notification to the backend
  }

  rejectRide() {
    // Implement ride rejection logic here
    this.socket.emit('rideRejected', this.activeTrip.customerId); // Send rejection notification to the backend
  }

  // Rest of the component code...
  
  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map('map').setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const searchButton = document.getElementById('search-button') as HTMLButtonElement;

    searchButton.addEventListener('click', () => {
      const destination = searchInput.value;
      this.searchDestination(destination);
    });
  }

  updateDriverLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position: GeolocationPosition) => {
          const { latitude, longitude } = position.coords;
          const driverLatLng = L.latLng(latitude, longitude);

          if (this.driverMarkers.length === 0) {
            this.driverMarkers.push(
              L.marker(driverLatLng, { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup('You are here')
            );
          } else {
            this.driverMarkers[0].setLatLng(driverLatLng);
          }

          this.map.panTo(driverLatLng);

          if (this.activeTrip) {
            const destinationLatLng = L.latLng(this.activeTrip.destination.lat, this.activeTrip.destination.lng);
            if (this.polyline) {
              this.map.removeLayer(this.polyline);
            }

            this.polyline = L.polyline(
              [
                [driverLatLng.lat, driverLatLng.lng],
                [destinationLatLng.lat, destinationLatLng.lng],
              ],
              { color: 'blue' }
            ).addTo(this.map);
          }
        },
        (error: GeolocationPositionError) => {
          console.error('Error getting driver location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  searchDestination(destination: string) {
    if (destination && google && this.map) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], {
            icon: this.getRandomCustomerIcon(),
          })
            .addTo(this.map)
            .bindPopup('Customer');

          if (this.driverMarkers.length > 0) {
            this.driverMarkers.forEach((marker) => this.map.removeLayer(marker));
            this.driverMarkers = [];
          }

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], {
              icon: this.getRandomDriverIcon(),
            })
              .addTo(this.map)
              .bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map((driver) => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          })
            .addTo(this.map)
            .bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline(
            [
              [center.lat(), center.lng()],
              [nearestDriver.lat, nearestDriver.lng],
            ],
            { color: 'red' }
          ).addTo(this.map);
        }
      });
    }
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

    this.socket.on('ride_request', (rideDetails: any) => {
      this.activeTrip = rideDetails;
    });

    this.socket.on('driverAvailabilityUpdated', (isAvailable: boolean) => {
      this.isAvailable = isAvailable;
    });

    this.socket.on('driverRatingUpdated', (rating: number) => {
      this.driverRating = rating;
    });

    this.socket.on('ride_accepted', (message: string) => {
      alert('Ride accepted: ' + message);
      // Send a message back to the customer
      const rideAcceptedMessage = 'Your ride has been accepted by ' + this.driverName;
      this.socket.emit('rideAccepted', rideAcceptedMessage);
    });

    this.socket.on('ride_rejected', (message: string) => {
      alert('Ride rejected: ' + message);
      // Send a message back to the customer
      const rideRejectedMessage = 'Your ride has been rejected by ' + this.driverName;
      this.socket.emit('rideRejected', rideRejectedMessage);
    });

    this.socket.on('ride_canceled', () => {
      alert('Ride canceled');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from the WebSocket server');
    });
  }
}


/*import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-driver',
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.css'],
})
export class DriverComponent implements OnInit {
  driverName: string = '';
  driverId: string = 'DR1234';
  driverRating: number = 4.5;
  totalEarnings: number = 1500;
  completedTrips: number = 50;
  isAvailable: boolean = true;
  activeTrip: any;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(private router: Router, private driverService: DriverService) {}

  ngOnInit() {
    this.driverName = this.driverService.getDriverName();
    this.initMap();
    this.initializeWebSocket();
    this.updateDriverLocation();
  }

  toggleAvailability() {
    this.isAvailable = !this.isAvailable;
    this.socket.emit('toggleAvailability', this.isAvailable);
  }

  completeTrip() {
    this.socket.emit('completeTrip');
    this.activeTrip = null;
  }

  logout() {
    // Implement your logout logic here
    this.router.navigate(['/']); // Redirect to the home page
  }

  acceptRide() {
    // Implement ride acceptance logic here
    this.socket.emit('acceptRide', this.activeTrip.customerId); // Send acceptance notification to the backend
  }

  rejectRide() {
    // Implement ride rejection logic here
    this.socket.emit('rejectRide', this.activeTrip.customerId); // Send rejection notification to the backend
  }

  // Rest of the component code...
  
  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map('map').setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const searchButton = document.getElementById('search-button') as HTMLButtonElement;

    searchButton.addEventListener('click', () => {
      const destination = searchInput.value;
      this.searchDestination(destination);
    });
  }

  updateDriverLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position: GeolocationPosition) => {
          const { latitude, longitude } = position.coords;
          const driverLatLng = L.latLng(latitude, longitude);

          if (this.driverMarkers.length === 0) {
            this.driverMarkers.push(
              L.marker(driverLatLng, { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup('You are here')
            );
          } else {
            this.driverMarkers[0].setLatLng(driverLatLng);
          }

          this.map.panTo(driverLatLng);

          if (this.activeTrip) {
            const destinationLatLng = L.latLng(this.activeTrip.destination.lat, this.activeTrip.destination.lng);
            if (this.polyline) {
              this.map.removeLayer(this.polyline);
            }

            this.polyline = L.polyline(
              [
                [driverLatLng.lat, driverLatLng.lng],
                [destinationLatLng.lat, destinationLatLng.lng],
              ],
              { color: 'blue' }
            ).addTo(this.map);
          }
        },
        (error: GeolocationPositionError) => {
          console.error('Error getting driver location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  searchDestination(destination: string) {
    if (destination && google && this.map) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], {
            icon: this.getRandomCustomerIcon(),
          })
            .addTo(this.map)
            .bindPopup('Customer');

          if (this.driverMarkers.length > 0) {
            this.driverMarkers.forEach((marker) => this.map.removeLayer(marker));
            this.driverMarkers = [];
          }

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], {
              icon: this.getRandomDriverIcon(),
            })
              .addTo(this.map)
              .bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map((driver) => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          })
            .addTo(this.map)
            .bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline(
            [
              [center.lat(), center.lng()],
              [nearestDriver.lat, nearestDriver.lng],
            ],
            { color: 'red' }
          ).addTo(this.map);
        }
      });
    }
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

    this.socket.on('ride_request', (rideDetails: any) => {
      this.activeTrip = rideDetails;
    });

    this.socket.on('driverAvailabilityUpdated', (isAvailable: boolean) => {
      this.isAvailable = isAvailable;
    });

    this.socket.on('driverRatingUpdated', (rating: number) => {
      this.driverRating = rating;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from the WebSocket server');
    });
  }

}
*/

/*import { Component, OnInit } from '@angular/core';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';
import { io, Socket } from 'socket.io-client';

declare var google: any;

@Component({
  selector: 'app-driver',
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.css'],
})
export class DriverComponent implements OnInit {
  driverName: string = '';
  driverId: string = 'DR1234';
  driverRating: number = 4.5;
  totalEarnings: number = 1500;
  completedTrips: number = 50;
  isAvailable: boolean = true;
  activeTrip: any;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: Socket;

  constructor(private driverService: DriverService) {}

  ngOnInit() {
    this.driverName = this.driverService.getDriverName();
    this.initMap();
    this.initializeWebSocket();
    this.updateDriverLocation();
  }

  toggleAvailability() {
    this.isAvailable = !this.isAvailable;
    this.socket.emit('toggleAvailability', this.isAvailable);
  }

  completeTrip() {
    this.socket.emit('completeTrip');
    this.activeTrip = null;
  }

  logout() {
    // Implement your logout logic here
  }

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map('map').setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const searchButton = document.getElementById('search-button') as HTMLButtonElement;

    searchButton.addEventListener('click', () => {
      const destination = searchInput.value;
      this.searchDestination(destination);
    });
  }

  updateDriverLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position: GeolocationPosition) => {
          const { latitude, longitude } = position.coords;
          const driverLatLng = L.latLng(latitude, longitude);

          if (this.driverMarkers.length === 0) {
            this.driverMarkers.push(
              L.marker(driverLatLng, { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup('You are here')
            );
          } else {
            this.driverMarkers[0].setLatLng(driverLatLng);
          }

          this.map.panTo(driverLatLng);

          if (this.activeTrip) {
            const destinationLatLng = L.latLng(this.activeTrip.destination.lat, this.activeTrip.destination.lng);
            if (this.polyline) {
              this.map.removeLayer(this.polyline);
            }

            this.polyline = L.polyline(
              [
                [driverLatLng.lat, driverLatLng.lng],
                [destinationLatLng.lat, destinationLatLng.lng],
              ],
              { color: 'blue' }
            ).addTo(this.map);
          }
        },
        (error: GeolocationPositionError) => {
          console.error('Error getting driver location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  searchDestination(destination: string) {
    if (destination && google && this.map) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], {
            icon: this.getRandomCustomerIcon(),
          })
            .addTo(this.map)
            .bindPopup('Customer');

          if (this.driverMarkers.length > 0) {
            this.driverMarkers.forEach((marker) => this.map.removeLayer(marker));
            this.driverMarkers = [];
          }

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], {
              icon: this.getRandomDriverIcon(),
            })
              .addTo(this.map)
              .bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map((driver) => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          })
            .addTo(this.map)
            .bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline(
            [
              [center.lat(), center.lng()],
              [nearestDriver.lat, nearestDriver.lng],
            ],
            { color: 'red' }
          ).addTo(this.map);
        }
      });
    }
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

    this.socket.on('rideRequest', (rideDetails: any) => {
      this.activeTrip = rideDetails;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from the WebSocket server');
    });
  }
}

*/


/*import { Component, OnInit } from '@angular/core';
import { DriverService } from '../services/driver.service';
import * as L from 'leaflet';

declare var google: any;

@Component({
  selector: 'app-driver',
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.css'],
})
export class DriverComponent implements OnInit {
  driverName: string = '';
  driverId: string = 'DR1234';
  driverRating: number = 4.5;
  totalEarnings: number = 1500;
  completedTrips: number = 50;
  isAvailable: boolean = true;
  activeTrip: any;
  map: any = null;
  customerMarker: any = null;
  driverMarkers: any[] = [];
  nearestDriverMarker: any = null;
  polyline: any = null;
  socket!: WebSocket; // Add the definite assignment assertion (!) after the property declaration

  constructor(private driverService: DriverService) {}

  ngOnInit() {
    this.driverName = this.driverService.getDriverName();
    this.initMap();
    this.initializeWebSocket();
    this.updateDriverLocation();
  }

  toggleAvailability() {
    this.isAvailable = !this.isAvailable;
    this.socket.send(JSON.stringify({ action: 'update_status', isAvailable: this.isAvailable }));
  }

  completeTrip() {
    this.socket.send(JSON.stringify({ action: 'complete_trip' }));
    this.activeTrip = null;
  }

  logout() {
    // Add your logout logic here
  }

  initMap() {
    const nairobiCoords = L.latLng(-1.2921, 36.8219);

    this.map = L.map('map').setView(nairobiCoords, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const searchButton = document.getElementById('search-button') as HTMLButtonElement;

    searchButton.addEventListener('click', () => {
      const destination = searchInput.value;
      this.searchDestination(destination);
    });
  }

  updateDriverLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position: GeolocationPosition) => {
          const { latitude, longitude } = position.coords;
          const driverLatLng = L.latLng(latitude, longitude);

          if (this.driverMarkers.length === 0) {
            this.driverMarkers.push(
              L.marker(driverLatLng, { icon: this.getRandomDriverIcon() }).addTo(this.map).bindPopup('You are here')
            );
          } else {
            this.driverMarkers[0].setLatLng(driverLatLng);
          }

          this.map.panTo(driverLatLng);

          if (this.activeTrip) {
            const destinationLatLng = L.latLng(this.activeTrip.destination.lat, this.activeTrip.destination.lng);
            if (this.polyline) {
              this.map.removeLayer(this.polyline);
            }

            this.polyline = L.polyline(
              [
                [driverLatLng.lat, driverLatLng.lng],
                [destinationLatLng.lat, destinationLatLng.lng],
              ],
              { color: 'blue' }
            ).addTo(this.map);
          }
        },
        (error: GeolocationPositionError) => {
          console.error('Error getting driver location:', error);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  searchDestination(destination: string) {
    if (destination && google && this.map) {
      const geocoder = new google.maps.Geocoder();
      const geocoderRequest = {
        address: destination,
      };

      geocoder.geocode(geocoderRequest, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const center = results[0].geometry.location;
          this.map.setView([center.lat(), center.lng()], 12);

          if (this.customerMarker) {
            this.map.removeLayer(this.customerMarker);
          }

          this.customerMarker = L.marker([center.lat(), center.lng()], {
            icon: this.getRandomCustomerIcon(),
          })
            .addTo(this.map)
            .bindPopup('Customer');

          if (this.driverMarkers.length > 0) {
            this.driverMarkers.forEach((marker) => this.map.removeLayer(marker));
            this.driverMarkers = [];
          }

          const driverLocations = [
            { location: this.getDriverLocation(center, 2), label: 'Truck 1' },
            { location: this.getDriverLocation(center, 3), label: 'Truck 2' },
            { location: this.getDriverLocation(center, 4), label: 'Truck 3' },
          ];

          driverLocations.forEach((driver) => {
            const driverMarker = L.marker([driver.location.lat, driver.location.lng], {
              icon: this.getRandomDriverIcon(),
            })
              .addTo(this.map)
              .bindPopup(driver.label);
            this.driverMarkers.push(driverMarker);
          });

          const nearestDriver = this.getNearestDriver(center, driverLocations.map((driver) => driver.location));

          if (this.nearestDriverMarker) {
            this.map.removeLayer(this.nearestDriverMarker);
          }

          this.nearestDriverMarker = L.marker([nearestDriver.lat, nearestDriver.lng], {
            icon: this.getRandomDriverIcon(),
          })
            .addTo(this.map)
            .bindPopup('Nearest Driver');

          if (this.polyline) {
            this.map.removeLayer(this.polyline);
          }

          this.polyline = L.polyline(
            [
              [center.lat(), center.lng()],
              [nearestDriver.lat, nearestDriver.lng],
            ],
            { color: 'red' }
          ).addTo(this.map);
        }
      });
    }
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
    const socketUrl = 'ws://ws://localhost:3000'; // Replace with your WebSocket server URL
    this.socket = new WebSocket(socketUrl);

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.action === 'ride_request') {
        // Handle ride request
        const { customer, destination } = message.data;
        const rideAcceptancePayload = {
          action: 'ride_accepted',
          data: {
            driver: this.driverName,
            customer,
            destination,
          },
        };
        this.socket.send(JSON.stringify(rideAcceptancePayload));
      }
    };

    this.socket.onclose = () => {
      console.log('Disconnected from the WebSocket server');
    };
  }
}

*/

