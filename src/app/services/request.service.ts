import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RequestService {
  getCustomerName: any;
  constructor() {}

  createRequest(requestData: any) {
    // Logic to create and submit a request
  }
}