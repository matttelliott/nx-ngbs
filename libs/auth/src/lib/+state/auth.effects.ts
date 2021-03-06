import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { createEffect, Actions, ofType, concatLatestFrom } from '@ngrx/effects'
import { getSelectors } from '@ngrx/router-store'
import { Store } from '@ngrx/store'
import { of } from 'rxjs'
import { catchError, map, switchMap, take, tap } from 'rxjs/operators'

import { AuthService } from '../auth.service'
import * as AuthActions from './auth.actions'

@Injectable()
export class AuthEffects {
  constructor(
    private readonly actions$: Actions,
    private readonly authService: AuthService,
    private readonly store: Store,
    private readonly router: Router
  ) {}

  public readonly init$ = createEffect(() =>
    this.authService.user$.pipe(
      take(1),
      map((user) => AuthActions.init({ user }))
    )
  )

  public readonly logIn$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logInSubmit),
      switchMap((action) => this.authService.logIn(action.credentials)),
      map((user) => {
        return user?.email
          ? AuthActions.logInSuccess({
              user,
            })
          : AuthActions.logInFailure({
              error: 'AuthEffects.logIn$: missing user or user.email',
            })
      }),
      catchError((error) => {
        console.error('AuthEffects.logIn$')
        console.error(error)

        return of(
          AuthActions.logInFailure({
            error,
          })
        )
      })
    )
  )

  public readonly signUp$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.signUpSubmit),
      switchMap((action) => this.authService.signUp(action.credentials)),
      map((user) =>
        user?.email
          ? AuthActions.signUpSuccess({
              user,
            })
          : AuthActions.signUpFailure({
              error: 'AuthEffects.signUp$ : missing user or user.email',
            })
      ),
      catchError((error) => {
        console.error('AuthEffects.signUp$')
        console.error(error)

        return of(
          AuthActions.signUpFailure({
            error,
          })
        )
      })
    )
  )

  public readonly updateEmail = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.updateEmail),
      switchMap(({ newEmail }) => this.authService.updateEmail(newEmail)),
      map(() => AuthActions.updateEmailSuccess()),
      catchError((error) => {
        console.log(error)
        return of(AuthActions.updateEmailFailure({ error }))
      })
    )
  )

  public readonly navigateOnLogInOrSignUpSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logInSuccess, AuthActions.signUpSuccess),
        concatLatestFrom(() =>
          this.store.select(getSelectors().selectRouteData)
        ),
        tap(([, routeData]) => {
          const targetUrl = routeData?.targetUrl || '/auth/settings'
          this.router.navigateByUrl(targetUrl).catch((reason) => {
            /*
             * TODO: Diagnose Error
             *
             * Angular is throwing an error when navigating away from a completed sign up or log in form
             * this error is preventing navigation on sign up or log in success
             * catching the error and calling navigate again navigates successfully
             *
             * ```typescript
             * error TypeError: Cannot delete property '0' of [object Array]
             * at Array.splice (<anonymous>)
             * at removeListItem (forms.mjs:1835)/
             * ```
             *
             *
             */
            console.error('error', reason)
            this.router.navigateByUrl(targetUrl)
          })
        })
      ),
    { dispatch: false }
  )

  public readonly logOutFromBackend = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logOut),
        switchMap(() => this.authService.logOut())
      ),
    { dispatch: false }
  )

  public readonly navigateOnLogOut = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logOut),
        concatLatestFrom(() =>
          this.store.select(getSelectors().selectRouteData)
        ),
        tap(([, routeData]) => {
          const targetUrl = routeData?.targetUrl || '/'
          this.router
            .navigateByUrl(targetUrl)
            .catch(() => this.router.navigateByUrl(targetUrl))
        })
      ),
    { dispatch: false }
  )
}
