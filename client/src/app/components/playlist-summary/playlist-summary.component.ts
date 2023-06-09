import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TripDisplay } from 'src/app/models/direction';
import { Artist, SpotifyUser, SpotifyVibe, Track, Vibe } from 'src/app/models/spotify-models';
import { SpotifyGetUserService } from 'src/app/services/spotify-api.service';
import { ChartDisplayService } from 'src/app/services/chart-display.service';
import { DataConstants } from 'src/app/constants/google-route.constant';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MapDialogComponent } from '../map-dialog/map-dialog.component';
import { _getEventTarget } from '@angular/cdk/platform';
import { FormatTimeService } from 'src/app/services/format-time.service';
import { PlaylistRequest } from 'src/app/models/playlist';
import { SpotifyObjectService } from 'src/app/services/spotify-object.service';
import { AuthStorageService } from 'src/app/services/auth-storage.service';
import { MatUserSaveComponent } from '../mat-user-save/mat-user-save.component';
import { LoginMatComponent } from '../login-mat/login-mat.component';
import { SpotifyConstants } from 'src/app/constants/spotify-api.constant';

@Component({
  selector: 'app-playlist-summary',
  templateUrl: './playlist-summary.component.html',
  styleUrls: ['./playlist-summary.component.css']
})
export class PlaylistSummaryComponent implements OnInit {

  @ViewChild('fileInput')
  imageFile!: ElementRef

  form!: FormGroup

  isPublic = false
  isCollaborative = false

  public chart: any;

  travelModes: any[] = DataConstants.travelModes

  optionsPanel = false

  tripDisplay!: TripDisplay
  relatedArtists!: Artist[]
  artists!: Artist[]
  selectedArtists: string[] = []
  selectedArtistsId: string[] = []
  selectedGenres: any[] = []
  vibe!: Vibe
  spotifyUser!: SpotifyUser
  allTracks: Track[] = []
  lockedTracks: Track[] = []
  displayTracks: Track[] = []
  playlistRequest!: PlaylistRequest
  duration = 0

  playlistUrl!: string

  img: any

  hasTracks!: boolean
  isLoading!: boolean

  tripDuration = ''
  playlistDuration = ''

  allSpotifyVibes: SpotifyVibe[] = SpotifyConstants.VIBES_ALL
  vibeButtonStyle!: string
  selectedVibeIdx!: number

  constructor(private router: Router,
    private spotifyGetUserService: SpotifyGetUserService,
    private spotifyModelService: SpotifyObjectService,
    private chartDisplayService: ChartDisplayService,
    private formatTimeService: FormatTimeService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private authStorageService: AuthStorageService) { }

  ngOnInit(): void {

    this.vibeButtonStyle = 'vibe-button'

    if (
      JSON.parse(sessionStorage.getItem('artists')!) == null
      || JSON.parse(sessionStorage.getItem('tripDisplay')!) == null
      || JSON.parse(sessionStorage.getItem('genres')!) == null
      || JSON.parse(sessionStorage.getItem('spotifyUser')!) == null
    ) {
      this.router.navigate(['/'])
    } else {
      this.artists = JSON.parse(sessionStorage.getItem('artists')!)
      this.tripDisplay = JSON.parse(sessionStorage.getItem('tripDisplay')!)
      this.selectedGenres = JSON.parse(sessionStorage.getItem('genres')!)
      this.spotifyUser = JSON.parse(sessionStorage.getItem('spotifyUser')!)
    }

    if (
      JSON.parse(sessionStorage.getItem('playlistRequest')!) != null
    ) {
      this.playlistRequest = JSON.parse(sessionStorage.getItem('playlistRequest')!)
      this.form = this.fb.group({
        playlistTitle: this.fb.control<string>(this.playlistRequest.title),
        playlistDescription: this.fb.control<string>(this.playlistRequest.description),
        playlistImage: this.fb.control(this.playlistRequest.imageData),
        isPublic: this.fb.control<boolean>(this.playlistRequest.isPublic),
        isCollaborative: this.fb.control<boolean>(this.playlistRequest.isCollaborative)
      })
    } else {
      this.form = this.fb.group({
        playlistTitle: this.fb.control<string>(''),
        playlistDescription: this.fb.control<string>(''),
        playlistImage: this.fb.control(''),
        isPublic: this.fb.control<boolean>(false),
        isCollaborative: this.fb.control<boolean>(false)
      })
    }

    this.getTracks()
    this.tripDuration = this.formatTimeService.formatToDisplayDuration(this.tripDisplay.duration)

    this.spotifyGetUserService.getRelatedArtists(this.artists[Math.floor(Math.random() * this.artists.length)].artistId)
      .then(
        (data: any) => {
          this.relatedArtists = this.spotifyModelService.convertToArtists(data.artists)
          let idx = 0
          for (let t of this.relatedArtists) {
            for (let s of this.artists) {
              if (t.name == s.name) {
                this.relatedArtists.splice(idx, 1)
              }
            }
            idx++
          }
        }
      )
  }

  processForm() {

    let title = this.form.value['playlistTitle']
    let description = this.form.value['playlistDescription']
    let songs: string[] = []
    let tracks: Track[] = []
    let imgData = ''

    for (let t of this.lockedTracks) {
      songs.push(t.uri)
      tracks.push(t)
    }

    for (let t of this.displayTracks) {
      songs.push(t.uri)
      tracks.push(t)
    }

    if (this.img !== undefined) {
      imgData = this.img
    }

    if (title == '') {
      title = 'Playlist for ' + this.tripDisplay.travelDate +
        ' by ' + this.tripDisplay.travelMode.toLowerCase()
    }

    if (description == '') {
      description = 'Playlist for ' + this.tripDisplay.travelDate +
        ' by ' + this.tripDisplay.travelMode.toLowerCase()
    }

    let trackIds: string[] = []
    for (let t of tracks) {
      trackIds.push(t.uri)
    }

    const playlistRequest: PlaylistRequest = {
      id: this.spotifyUser.id,
      title: title,
      isPublic: this.isPublic,
      isCollaborative: this.isCollaborative,
      description: description,
      songs: trackIds,
      imageData: imgData,
    }

    sessionStorage.setItem('playlistRequest', JSON.stringify(playlistRequest))
    sessionStorage.setItem('tracks', JSON.stringify(tracks))
    sessionStorage.setItem('vibe', JSON.stringify(this.vibe))

    sessionStorage.setItem('_temp-locked-tracks', JSON.stringify(this.lockedTracks))
    sessionStorage.setItem('_temp-display-tracks', JSON.stringify(this.displayTracks))

    if (this.authStorageService.isLoggedIn()) {
      console.info("logged in")
      this.openSaveDialog('0ms', '0ms')
    }
    else {
      this.openLoginDialog('0ms', '0ms')
    }
  }

  openSaveDialog(enterAnimationDuration: string, exitAnimationDuration: string): void {
    this.dialog.open(MatUserSaveComponent, {
      width: '500px',
      height: '250px',
      enterAnimationDuration,
      exitAnimationDuration,
    });
  }

  openLoginDialog(enterAnimationDuration: string, exitAnimationDuration: string): void {
    this.dialog.open(LoginMatComponent, {
      width: '500px',
      height: '500px',
      enterAnimationDuration,
      exitAnimationDuration,
    });
  }

  selectVibe(idx: number) {
    this.selectedVibeIdx = idx
    this.getTracks(idx)
    this.vibeButtonStyle = 'vibe-selected-button'
  }

  getTracks(selectedVibeIdx?: number) {
    /* Spotify Recommendations only produces 100 tracks per request
    In order to get more than 100 songs, split into several requests */
    this.artists = JSON.parse(sessionStorage.getItem('artists')!)
    this.selectedGenres = JSON.parse(sessionStorage.getItem('genres')!)

    this.setUpSelectedArtists()
    const seeds = this.shuffleSeeds()

    this.isLoading = true
    this.displayTracks = []
    this.allTracks = []
    let promiseArr = []
    let numArr = []
    const songNum = Math.floor(this.tripDisplay.duration / 3.5 / 60)
    let leftoverNum = 0

    if (songNum > 100) {
      leftoverNum = songNum % 100
      for (let i = 0; i < (songNum - leftoverNum) / 100; i++) {
        numArr.push(100)
      }
      if (leftoverNum > 0) {
        numArr.push(leftoverNum)
      }
    }

    if (songNum <= 100) {
      numArr.push(songNum)
    }

    if (selectedVibeIdx !== undefined) {
      for (let d of numArr) {
        promiseArr.push(this.spotifyGetUserService.getRecommendations(seeds.seed_artists, seeds.seed_genres, d, selectedVibeIdx))
      }
    } else {
      for (let d of numArr) {
        promiseArr.push(this.spotifyGetUserService.getRecommendations(seeds.seed_artists, seeds.seed_genres, d))
      }
    }

    Promise.allSettled(promiseArr).then(
      (data: any) => {

        for (let songs of data) {
          if (songs.status == 'rejected' || songs.value.tracks.length == 0) {
            this.hasTracks = false
            this.isLoading = false
            return
          } else {
            this.allTracks.push(...this.spotifyModelService.convertToTracks(songs.value.tracks))
          }
        }
        if (this.allTracks.length > 0) {
          this.hasTracks = true
          this.isLoading = false

          if (JSON.parse(sessionStorage.getItem('_temp-locked-tracks')!) != null
            || JSON.parse(sessionStorage.getItem('_temp-display-tracks')!) != null) {

            this.lockedTracks = JSON.parse(sessionStorage.getItem('_temp-locked-tracks')!)
            this.displayTracks = JSON.parse(sessionStorage.getItem('_temp-display-tracks')!)

          } else {
            this.displayTracks = this.allTracks.slice(this.lockedTracks.length)
          }
          let trackIds: string[] = []
          for (let t = 0; t < this.displayTracks.length + this.lockedTracks.length; t++) {
            trackIds.push(this.displayTracks[t].trackId)
          }
          const trackIdString = trackIds.join(',')
          this.spotifyGetUserService.getAudioFeatures(trackIdString).then(
            (data: any) => {
              this.vibe = this.spotifyModelService.calculateAverageFeatures(data.audio_features)

              if (this.chart !== undefined) {
                this.chartDisplayService.destoryChart(this.chart)
                this.chart = this.chartDisplayService.createChart(this.vibe)
              } else {
                this.chart = this.chartDisplayService.createChart(this.vibe)
              }

              this.duration = this.vibe.totalDuration
              this.playlistDuration = this.formatTimeService.formatToDisplayDuration(this.vibe.totalDuration / 1000)

            }
          )

        } else {
          this.getTracks()
        }
      }
    )
  }

  reloadTracks() {
    sessionStorage.removeItem('_temp-locked-tracks')
    sessionStorage.removeItem('_temp-display-tracks')
    this.getTracks()
  }

  shuffleSeeds() {
    let shuffledArtist = this.selectedArtistsId.sort(() => 0.5 - Math.random())
    let shuffledGenre = this.selectedGenres.sort(() => 0.5 - Math.random())
    let selectedA = shuffledArtist.splice(0, 3)
    let selectedG = shuffledGenre.splice(0, 2)
    const seed_artists = selectedA.join(',')
    const seed_genres = selectedG.join(',')
    return ({ seed_artists: seed_artists, seed_genres: seed_genres })
  }

  deleteTrack(idx: number) {
    console.info(this.duration)
    this.displayTracks.splice(idx, 1)
    this.duration -= this.displayTracks[idx].durationMs
    this.playlistDuration = this.formatTimeService.formatToDisplayDuration(this.duration / 1000)


  }

  deleteLockedTrack(idx: number) {
    this.lockedTracks.splice(idx, 1)
    this.duration -= this.lockedTracks[idx].durationMs
    this.playlistDuration = this.formatTimeService.formatToDisplayDuration(this.duration / 1000)


  }

  unlockTrack(idx: number) {
    this.displayTracks.splice(idx, 0, this.lockedTracks[idx])
    this.lockedTracks.splice(idx, 1)

  }

  lockTrack(idx: number) {
    this.lockedTracks.push(this.displayTracks[idx])
    this.displayTracks.splice(idx, 1)
  }

  openDialog(enterAnimationDuration: string, exitAnimationDuration: string): void {
    this.dialog.open(MapDialogComponent, {
      enterAnimationDuration,
      exitAnimationDuration,
    });
  }

  onFileSelected(event: any) {

    var reader = new FileReader()
    reader.readAsDataURL(event.target.files[0])

    reader.onload = (_getEventTarget) => {
      this.img = reader.result
    }

  }

  toggle() {
    this.optionsPanel = !this.optionsPanel;
  }

  slidePublic() {
    this.isPublic = !this.isPublic
    this.form.controls['isPublic'].setValue(this.isPublic)
  }

  slideCollaborative() {
    this.isCollaborative = !this.isCollaborative
    this.form.controls['isCollaborative'].setValue(this.isCollaborative)
  }

  setUpSelectedArtists() {
    for (let a of this.artists) {
      this.selectedArtists.push(a.name)
      this.selectedArtistsId.push(a.artistId)
    }
  }

  openArtistUri(idx: number) {
    window.open(this.relatedArtists[idx].uri, "_blank");
  }

  reloadWindow() {
    window.location.reload()
  }

}
