import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SpotifyAuthService } from 'src/app/services/spotify-auth.service';

@Component({
  selector: 'app-connect-spotify',
  templateUrl: './connect-spotify.component.html',
  styleUrls: ['./connect-spotify.component.css']
})
export class ConnectSpotifyComponent implements OnInit {

  request!: Request
  param$!: Subscription
  redirectUrl!: string

  username = ''

  constructor(
    private activatedRoute: ActivatedRoute,
    private spotifyAuthService: SpotifyAuthService) {

  }

  ngOnInit(): void {

    if (this.activatedRoute.snapshot.queryParams['redirectUrl'] != null) {
      this.redirectUrl = this.activatedRoute.snapshot.queryParams['redirectUrl']
      sessionStorage.setItem('redirectUrl', this.redirectUrl)
    }

  }

  connectSpotify() {
    this.spotifyAuthService.getSpotifyUserLogin()
  }





}
